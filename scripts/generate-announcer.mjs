#!/usr/bin/env node
// Run with Node 24+; this script alone reads the server-side API key.
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { dialogue } from '../lib/battle-announcer/dialogue.ts';

// Developer-only Node script: Next.js loads .env.local for the app, but plain
// Node does not. Never bundle this script or expose its key to client code.
if (!process.env.ELEVENLABS_API_KEY) {
  try {
    loadEnvFile(join(process.cwd(), '.env.local'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error(
    'Set ELEVENLABS_API_KEY in .env.local or the shell before generating announcer clips.',
  );
  process.exitCode = 1;
} else {
  const dir = join(process.cwd(), 'public/announcer');
  const manifestPath = join(dir, 'manifest.json');
  await mkdir(dir, { recursive: true });
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    /* first run */
  }
  const entries = Object.entries(dialogue).flatMap(([event, lines]) =>
    lines.map((text, index) => [`${event}-${index + 1}`, text]),
  );
  const valid = new Set(entries.map(([id]) => id));
  for (const id of Object.keys(manifest))
    if (!valid.has(id)) delete manifest[id];
  const force = process.argv.includes('--force');
  let failures = 0;
  let fatalError = false;
  for (const [id, text] of entries) {
    const filename = `${id}.mp3`;
    const path = join(dir, filename);
    if (!force) {
      try {
        if ((await stat(path)).size > 0) {
          manifest[id] = `/announcer/${filename}`;
          continue;
        }
      } catch {
        /* missing clip */
      }
    }
    try {
      if (!(await stat(path)).size) delete manifest[id];
    } catch {
      delete manifest[id];
    }
    try {
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/Vs5CmVCVJwW4odQS2pVf?output_format=mp3_44100_128',
        {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok) {
        // Account/voice eligibility and rate limits won't improve on the next line.
        fatalError = [401, 402, 403, 429].includes(response.status);
        throw new Error(
          `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      if (!response.headers.get('content-type')?.includes('audio/'))
        throw new Error(
          `Expected audio, got ${response.headers.get('content-type')}`,
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error('Empty audio response');
      await writeFile(`${path}.tmp`, bytes);
      await rename(`${path}.tmp`, path);
      manifest[id] = `/announcer/${filename}`;
      console.log(`Generated ${filename}`);
    } catch (error) {
      failures++;
      console.error(`${id}: ${error instanceof Error ? error.message : error}`);
    }
    // Keep successfully generated clips usable even if a later request fails.
    await writeFile(
      `${manifestPath}.tmp`,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await rename(`${manifestPath}.tmp`, manifestPath);
    if (fatalError) break;
  }
  if (failures) {
    console.error(
      fatalError
        ? 'Generation stopped: resolve the ElevenLabs account/voice or rate-limit error above, then run again.'
        : `${failures} clip(s) failed. Run again to resume.`,
    );
    process.exitCode = 1;
  }
}

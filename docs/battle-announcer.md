# Battle announcer clips

The live battle announcer uses hardcoded lines in `lib/battle-announcer/dialogue.ts`.
All 63 variations are supplied as MP3s in `public/announcer/`, indexed by
`manifest.json`. Captions work without generated audio. The battle browser
never contacts ElevenLabs.

With Node 24+, set `ELEVENLABS_API_KEY` in `.env.local` or your local shell
(never use a `NEXT_PUBLIC_` variable or commit the key), then run:

```sh
node scripts/generate-announcer.mjs
```

The script generates `public/announcer/<event>-<variation>.mp3` and updates
`public/announcer/manifest.json`. Commit the generated clips and manifest to
ship voice playback. Existing files are skipped, so interrupted runs can be
resumed. Use `--force` to regenerate all clips after changing dialogue or
voice settings. Failed requests leave previous clips intact; the script exits
nonzero and reports each failure. Missing clips remain captions-only.
Restart the Next.js development server after generation so its client bundle
loads the updated manifest. The global sound mute must be off, and you must
interact with the page before the browser permits playback.

The requested voice `Vs5CmVCVJwW4odQS2pVf` is a library voice. ElevenLabs
returns HTTP 402 (`paid_plan_required`) for this voice on a free account.
Configuring the API key in Next.js or Convex does not grant voice access;
generation requires an ElevenLabs plan that permits this voice. On 401/402/403
or 429, the script stops after the first error instead of retrying every line.
The supplied clips were instead produced one dialogue at a time through the
signed-in ElevenLabs API Playground's GUI and downloaded as MP3s; no runtime
API key is necessary to play those static assets.

The request uses ElevenLabs' [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert):
`POST /v1/text-to-speech/{voice_id}`, `xi-api-key`, JSON `text` and
`model_id: eleven_multilingual_v2`, with `output_format=mp3_44100_128`.

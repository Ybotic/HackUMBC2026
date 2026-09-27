'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { IMAGE_GENERATION_MODEL } from '../lib/constants/imageGeneration';

// Generate standalone collectible creature artwork in the established 5:7 format.
export const getPrompt = (prompt: string) => {
  const systemPrompt = `<task>
Create one piece of original collectible digital character artwork. Treat the user's prompt as the creature/concept brief.
</task>

<format>
  <ratio>Portrait 5:7 composition, preserving the established 2.5 x 3.5 inch proportions.</ratio>
  <presentation>Create standalone collectible creature artwork only—not a trading card, card face, product mockup, phone screen, or digital UI.</presentation>
  <subject>Show one original creature as the focal subject. Use a bold, dramatic composition with a distinctive silhouette and expressive pose; vary the framing and pose to suit each creature.</subject>
</format>

<visual_style>
Retro underground horror-comic illustration with a hand-inked, screen-printed, punk/psychedelic aesthetic. Use thick irregular dark-ink outlines, scratchy cross-hatching, rough expressive hand-drawn linework, flat screen-printed color blocks, strong ink/highlight/shadow contrast, deep graphic shadows, halftone dots, stippling, distressed print grain, ink splatters, scratches, uneven registration, misprinted areas, exaggerated grotesque anatomy, distorted proportions, unusual silhouettes, and chaotic psychedelic shapes.
<palette>Do not use a fixed palette. Choose colors organically for each creature's personality, environment, type, and mood. Keep each palette expressive and screen-print friendly, but make every card's colors distinct.</palette>
<avoid>Do not use smooth gradients, glossy 3D rendering, photorealism, clean vector art, overly polished digital painting, or generic modern cartoon aesthetics.</avoid>
</visual_style>

<creature_design>
Create a completely original, strange, memorable, slightly unsettling creature with a distinctive silhouette that could become the mascot of its own collectible art collection. Use expressive asymmetry, warped proportions, bizarre limbs, distorted facial features, unusual textures, and unnatural poses. Make it feel like it came from an obscure underground horror comic or psychedelic punk poster, not a conventional fantasy-monster franchise.
</creature_design>

<composition>
Make the creature the dominant focal point in a dramatic, energetic pose. Surround it with strange environmental details, abstract shapes, distorted textures, ink marks, and psychedelic horror imagery that reinforce its personality without overpowering its silhouette. Use the full canvas as artwork; do not place the creature inside a framed illustration window.
</composition>

<surface_quality>
Make the artwork feel handmade and tactile, like a rare illustration reproduced as a rough screen-printed punk poster. Include intentional ink bleed, slight misregistration, halftone patterns, scratches, paper/print grain, uneven ink density, and screen-print artifacts. These should feel authentic and deliberate, not like accidental low quality.
</surface_quality>

<variation>
Keep every artwork visually unique. Do not force repeated colors, a fixed composition, or a card frame. The shared identity comes from the hand-inked horror-comic linework, screen-printed imperfections, grotesque original creatures, and underground punk/psychedelic mood.
</variation>

<avoid>
Do not include a card frame or border, title/name plate, HP or other stats, attack or defense values, moves, abilities, energy costs, weakness/resistance fields, rarity marks, set numbers, flavor text, logos, labels, lettering, UI elements, hands holding an object, or watermarks. Do not copy existing franchise characters or logos.
</avoid>

<user_prompt>
${prompt}
</user_prompt>`;
  return systemPrompt;
};

export const generateImage = internalAction({
  args: {
    imageGenId: v.id('imageGenerations'),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { put } = await import('@vercel/blob');
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OPENROUTER_API_KEY is not configured in the Convex deployment.',
        );
      }
      const blobToken = process.env.MINT_READ_WRITE_TOKEN;
      if (!blobToken) {
        throw new Error(
          'MINT_READ_WRITE_TOKEN is not configured in the Convex deployment.',
        );
      }

      const response = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: IMAGE_GENERATION_MODEL,
          prompt: getPrompt(args.prompt),
          n: 1,
          size: '1024x1434',
          output_format: 'png',
        }),
      });

      const result = (await response.json()) as {
        data?: Array<{ b64_json?: string; media_type?: string }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            `OpenRouter image generation failed (${response.status}).`,
        );
      }

      const imageFile = result.data?.find((image) => image.b64_json);
      if (!imageFile?.b64_json) {
        throw new Error('OpenRouter returned no generated image.');
      }

      const mimeType = imageFile.media_type || 'image/png';
      const extensionByMimeType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
      };
      const extension = extensionByMimeType[mimeType] || 'png';
      const imageBuffer = Buffer.from(imageFile.b64_json, 'base64');

      const timestamp = Date.now();
      const filename = `generated-images/${timestamp}-${args.imageGenId}.${extension}`;

      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: mimeType,
        token: blobToken,
      });

      await ctx.runMutation(internal.images.saveGeneratedImage, {
        imageGenId: args.imageGenId,
        imageUrl: blob.url,
      });

      return { url: blob.url };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      await ctx.runMutation(internal.images.markImageAsFailed, {
        imageGenId: args.imageGenId,
        error: errorMessage,
      });

      throw error;
    }
  },
});

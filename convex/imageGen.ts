'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { IMAGE_GENERATION_MODEL } from '../lib/constants/imageGeneration';

// flash model can go down to 600-700px but we want 1024x1024px
export const getPrompt = (prompt: string) => {
  const systemPrompt = `<task>
Generate a vibrant cartoon-style NFT character image
</task>

<requirements>
  <dimensions>1024x1024 pixels</dimensions>
  <art_style>Vibrant cartoon art, clean digital illustration, bold colors</art_style>
  <format>NFT character portrait</format>
</requirements>

<character_specifications>
  <background>
    <instruction>Choose one solid color background</instruction>
    <options>bright blue, purple, orange, pink, green, yellow, red, cyan, magenta, lime</options>
  </background>
  
  <clothing>
    <instruction>Select one clothing type with unique color combinations</instruction>
    <options>
      <option>Simple t-shirt with graphic or solid color</option>
      <option>Stylish jacket or hoodie</option>
      <option>Futuristic armor or tech wear</option>
    </options>
  </clothing>
  
  <accessories>
    <instruction>Add one accessory based on rarity level</instruction>
    <common>Baseball cap, beanie, simple hat</common>
    <uncommon>Round glasses, rectangular glasses, sunglasses</uncommon>
    <rare>Gold necklace, silver chain, jewelry</rare>
  </accessories>
  
  <expression>
    <instruction>Choose one facial expression</instruction>
    <options>happy smile, determined look, curious expression</options>
  </expression>
</character_specifications>

<style_guidelines>
  <colors>Use bright, saturated colors that pop</colors>
  <lines>Clean, bold outlines</lines>
  <shading>Simple but effective shading</shading>
  <overall>Make it collectible and appealing like popular NFT collections</overall>
</style_guidelines>

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
          aspect_ratio: '1:1',
          resolution: '1K',
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

import { NextResponse } from 'next/server';
import { Buffer, Blob } from 'node:buffer';
import { pinata } from '@/lib/pinata';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';

export async function POST(req: Request) {
  try {
    const { url, metadata, metadataOnly } = await req.json();
    if (!url && !metadataOnly) {
      return NextResponse.json(
        { error: 'Image URL is required.' },
        { status: 400 },
      );
    }

    if (metadataOnly) {
      const metadataUpload = await pinata.upload.public.json(metadataOnly);
      const metadataUrl = await pinata.gateways.public.convert(
        metadataUpload.cid,
      );
      return NextResponse.json({ metadataUrl }, { status: 200 });
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer]);

    const uploadResult = await pinata.upload.public.file(
      blob as unknown as File,
    );
    const ipfsUrl = await pinata.gateways.public.convert(uploadResult.cid);

    try {
      await fetchMutation(api.images.updateImageIpfsUrl, {
        imageUrl: url,
        ipfsUrl,
      });
    } catch (dbError) {
      console.warn('Failed to update ipfsUrl in database:', dbError);
      // continue even if database update fails
    }

    let metadataUrl: string | undefined;
    if (metadata) {
      const metadataUpload = await pinata.upload.public.json({
        ...metadata,
        image: ipfsUrl,
        properties: {
          files: [{ uri: ipfsUrl, type: response.headers.get('content-type') }],
          category: 'image',
        },
      });
      metadataUrl = await pinata.gateways.public.convert(metadataUpload.cid);
    }

    return NextResponse.json({ url: ipfsUrl, metadataUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading image to IPFS via Pinata:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

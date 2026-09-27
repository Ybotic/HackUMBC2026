import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export async function POST(request: NextRequest) {
  const hasBlobCredentials = Boolean(
    env.MINT_READ_WRITE_TOKEN ||
      env.BLOB_STORE_ID ||
      env.MINT_STORE_ID ||
      env.BLOB_READ_WRITE_TOKEN,
  );

  if (!hasBlobCredentials) {
    return NextResponse.json(
      { error: 'Profile picture uploads are not configured yet.' },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userAddress = formData.get('userAddress') as string;

    if (!file || !userAddress) {
      return NextResponse.json(
        { error: 'File and user address are required' },
        { status: 400 },
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image file is too large (max 5MB)' },
        { status: 400 },
      );
    }

    const fileExtension = file.type.split('/')[1] || 'jpg';
    const filename = `profile-pictures/${userAddress}-${Date.now()}.${fileExtension}`;

    const blob = await put(filename, file, {
      access: 'public',
      ...(env.MINT_READ_WRITE_TOKEN
        ? { token: env.MINT_READ_WRITE_TOKEN }
        : {}),
      ...(env.MINT_STORE_ID ? { storeId: env.MINT_STORE_ID } : {}),
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 },
    );
  }
}

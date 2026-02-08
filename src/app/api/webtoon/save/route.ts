import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body = (await request.json()) as { image: string; userId: string; sourceImageIds?: string[] };
    const { image, userId, sourceImageIds } = body;

    if (!image || !userId) {
      return NextResponse.json(
        { error: 'Missing image or userId' },
        { status: 400 }
      );
    }

    // Validate bindings
    if (!env.R2 || !env.DB) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const ALLOWED_MIME_TYPES = ['jpeg', 'jpg', 'png', 'webp'];
    const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~15MB decoded (webtoons can be large)

    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const imageType = base64Match[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(imageType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const base64Data = base64Match[2];
    if (base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    const mimeType = `image/${imageType}`;

    // Save to R2
    const imageId = generateUUID();
    const r2Key = `webtoons/${imageId}.${base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1]}`;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    await env.R2.put(r2Key, bytes, {
      httpMetadata: { contentType: mimeType },
    });

    // Save to DB - rollback R2 on failure
    try {
      await env.DB.prepare(
        `INSERT INTO generated_images (id, r2_key, type, user_id, source_image_ids) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(imageId, r2Key, 'webtoon', userId, sourceImageIds ? JSON.stringify(sourceImageIds) : null)
        .run();
    } catch (dbError) {
      console.error('DB insert failed, rolling back R2:', dbError);
      try {
        await env.R2.delete(r2Key);
      } catch (r2Error) {
        console.error('R2 rollback failed:', r2Error);
      }
      return NextResponse.json({ error: 'Failed to save webtoon' }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error('Webtoon Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to save webtoon' },
      { status: 500 }
    );
  }
}

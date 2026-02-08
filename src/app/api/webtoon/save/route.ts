import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

const ALLOWED_MIME_TYPES = ['jpeg', 'jpg', 'png', 'webp'];
const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~15MB decoded

function parseDataUri(dataUri: string): { mimeType: string; imageType: string; base64Data: string } | null {
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) return null;

  const header = dataUri.substring(0, commaIndex);
  // header should be like "data:image/png;base64"
  if (!header.startsWith('data:image/') || !header.endsWith(';base64')) return null;

  const imageType = header.substring(11, header.indexOf(';')).toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(imageType)) return null;

  const base64Data = dataUri.substring(commaIndex + 1);
  return { mimeType: `image/${imageType}`, imageType, base64Data };
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    let body: { image: string; userId: string; sourceImageIds?: string[]; type?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { image, userId, sourceImageIds, type: imageType = 'webtoon' } = body;
    const validTypes = ['webtoon', 'frame'];
    const saveType = validTypes.includes(imageType) ? imageType : 'webtoon';

    if (!image || !userId) {
      return NextResponse.json({ error: 'Missing image or userId' }, { status: 400 });
    }

    if (!env.R2 || !env.DB) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const parsed = parseDataUri(image);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    if (parsed.base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    // Decode base64 to binary
    const binaryString = atob(parsed.base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Save to R2
    const imageId = generateUUID();
    const ext = parsed.imageType === 'jpeg' ? 'jpg' : parsed.imageType;
    const r2Key = `webtoons/${imageId}.${ext}`;

    await env.R2.put(r2Key, bytes, {
      httpMetadata: { contentType: parsed.mimeType },
    });

    // Save to DB - rollback R2 on failure
    try {
      if (sourceImageIds && sourceImageIds.length > 0) {
        // Try with source_image_ids column first, fallback without it
        try {
          await env.DB.prepare(
            `INSERT INTO generated_images (id, r2_key, type, user_id, source_image_ids) VALUES (?, ?, ?, ?, ?)`
          )
            .bind(imageId, r2Key, saveType, userId, JSON.stringify(sourceImageIds))
            .run();
        } catch {
          // Column may not exist yet — insert without it
          await env.DB.prepare(
            `INSERT INTO generated_images (id, r2_key, type, user_id) VALUES (?, ?, ?, ?)`
          )
            .bind(imageId, r2Key, saveType, userId)
            .run();
        }
      } else {
        await env.DB.prepare(
          `INSERT INTO generated_images (id, r2_key, type, user_id) VALUES (?, ?, ?, ?)`
        )
          .bind(imageId, r2Key, saveType, userId)
          .run();
      }
    } catch (dbError) {
      console.error('DB insert failed, rolling back R2:', dbError);
      try {
        await env.R2.delete(r2Key);
      } catch (r2Error) {
        console.error('R2 rollback failed:', r2Error);
      }
      return NextResponse.json({ error: 'Database save failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error('Webtoon Save Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // Distinguish OOM/size issues
    if (msg.includes('memory') || msg.includes('size') || msg.includes('too large')) {
      return NextResponse.json({ error: 'Image too large to process' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Failed to save webtoon' }, { status: 500 });
  }
}

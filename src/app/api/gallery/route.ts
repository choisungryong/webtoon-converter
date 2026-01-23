import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../utils/commonUtils';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const url = new URL(request.url);
    // Header is being stripped in Cloudflare environment, fallback to Query Param
    const userId =
      request.headers.get('x-user-id') || url.searchParams.get('userId');

    if (!env.DB) {
      return NextResponse.json({ error: 'DB binding failed' }, { status: 500 });
    }

    // const url = new URL(request.url); // Removed duplicate declaration
    const type = url.searchParams.get('type') || 'image';

    let results;

    if (userId) {
      // Strict mode: Only show images for the current user
      // For 'image' type, also include NULL types (legacy data)
      const typeCondition =
        type === 'image' ? '(type = ? OR type IS NULL)' : 'type = ?';

      const stmt = await env.DB.prepare(
        `SELECT * FROM generated_images WHERE user_id = ? AND ${typeCondition} ORDER BY created_at DESC LIMIT 50`
      ).bind(userId, type);
      results = (await stmt.all()).results;
    } else {
      // Anonymous/Public fallback - Show ONLY anonymous (public) images
      const typeCondition =
        type === 'image' ? '(type = ? OR type IS NULL)' : 'type = ?';

      // Modified to strict anonymous check only
      const stmt = await env.DB.prepare(
        `SELECT * FROM generated_images WHERE user_id IS NULL AND ${typeCondition} ORDER BY created_at DESC LIMIT 50`
      ).bind(type);
      results = (await stmt.all()).results;
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ images: [] });
    }

    const imagesWithUrls = results.map((img: any) => ({
      id: img.id,
      url: `/api/gallery/${img.id}/image`,
      original_url: img.original_r2_key
        ? `/api/gallery/${img.id}/image/original`
        : null,
      createdAt: img.created_at,
      prompt: img.prompt,
      type: img.type,
    }));

    return NextResponse.json({ images: imagesWithUrls });
  } catch (error) {
    console.error('Gallery Fetch Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body = (await request.json()) as { image: string; userId: string };
    const { image, userId } = body;

    // ... (validation checks omitted for brevity, logic remains same)
    if (!env.DB || !env.R2)
      return NextResponse.json(
        { error: 'System configuration error' },
        { status: 500 }
      );
    if (!image || !userId)
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    // ... (decoding logic omitted)
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match)
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    const mimeType = `image/${base64Match[1]}`;
    const binaryString = atob(base64Match[2]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++)
      bytes[i] = binaryString.charCodeAt(i);

    const imageId = generateUUID();
    const r2Key = `generated/${imageId}.png`;

    await env.R2.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } });

    await env.DB.prepare(
      `INSERT INTO generated_images (id, r2_key, type, prompt, user_id) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(imageId, r2Key, 'image', 'User Edited Image', userId)
      .run();

    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error('Gallery Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to save', message: (error as Error).message },
      { status: 500 }
    );
  }
}

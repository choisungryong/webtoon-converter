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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    let results;

    if (userId) {
      // Strict mode: Only show images for the current user
      // For 'image' tab: show image, generated, webtoon, and legacy NULL types (exclude frame/premium)
      const typeCondition =
        type === 'image'
          ? "(type IN ('image', 'generated', 'webtoon') OR type IS NULL)"
          : 'type = ?';

      const query = `SELECT id, r2_key, original_r2_key, type, prompt, created_at FROM generated_images WHERE user_id = ? AND ${typeCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const stmt = type === 'image'
        ? await env.DB.prepare(query).bind(userId, limit, offset)
        : await env.DB.prepare(query).bind(userId, type, limit, offset);
      results = (await stmt.all()).results;
    } else {
      // Anonymous/Public fallback
      const typeCondition =
        type === 'image'
          ? "(type IN ('image', 'generated', 'webtoon') OR type IS NULL)"
          : 'type = ?';

      const query = `SELECT id, r2_key, original_r2_key, type, prompt, created_at FROM generated_images WHERE user_id IS NULL AND ${typeCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const stmt = type === 'image'
        ? await env.DB.prepare(query).bind(limit, offset)
        : await env.DB.prepare(query).bind(type, limit, offset);
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
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body = (await request.json()) as {
      image: string;
      userId: string;
      originalImage?: string; // Optional: original photo for premium re-conversion
    };
    const { image, userId, originalImage } = body;

    if (!env.DB || !env.R2)
      return NextResponse.json(
        { error: 'System configuration error' },
        { status: 500 }
      );
    if (!image || !userId)
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });

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

    // Save original photo to R2 if provided (for future premium re-conversion)
    const MAX_ORIGINAL_BASE64 = 10 * 1024 * 1024; // ~7.5MB decoded
    let originalR2Key: string | null = null;
    if (originalImage) {
      if (typeof originalImage !== 'string' || originalImage.length > MAX_ORIGINAL_BASE64) {
        return NextResponse.json({ error: 'Original image too large' }, { status: 413 });
      }
      const origMatch = originalImage.match(/^data:image\/(\w+);base64,(.+)$/);
      if (origMatch) {
        const origMimeType = `image/${origMatch[1]}`;
        const origBinary = atob(origMatch[2]);
        const origBytes = new Uint8Array(origBinary.length);
        for (let i = 0; i < origBinary.length; i++)
          origBytes[i] = origBinary.charCodeAt(i);
        originalR2Key = `originals/${imageId}.${origMatch[1] === 'jpeg' ? 'jpg' : origMatch[1]}`;
        await env.R2.put(originalR2Key, origBytes, { httpMetadata: { contentType: origMimeType } });
      }
    }

    try {
      await env.DB.prepare(
        `INSERT INTO generated_images (id, r2_key, original_r2_key, type, prompt, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(imageId, r2Key, originalR2Key, 'image', 'User Edited Image', userId, Date.now())
        .run();
    } catch (dbError) {
      console.error('DB insert failed, rolling back R2:', dbError);
      try { await env.R2.delete(r2Key); } catch (_) { /* best effort */ }
      if (originalR2Key) {
        try { await env.R2.delete(originalR2Key); } catch (_) { /* best effort */ }
      }
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error('Gallery Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to save' },
      { status: 500 }
    );
  }
}

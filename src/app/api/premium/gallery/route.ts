import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: Fetch premium webtoons for user
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch premium webtoons for user
    const result = await env.DB.prepare(
      `SELECT id, r2_key, source_webtoon_id, created_at as createdAt 
             FROM premium_webtoons 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`
    )
      .bind(userId)
      .all();

    const images = (result.results || []).map((row: any) => ({
      id: row.id,
      r2_key: row.r2_key,
      source_webtoon_id: row.source_webtoon_id,
      createdAt: row.createdAt,
      url: `/api/premium/${row.id}/image`, // Use API endpoint instead of direct R2 URL
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('[Premium/Gallery] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a premium webtoon
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!imageId) {
      return NextResponse.json({ error: 'Missing image ID' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the record and verify ownership
    const row = (await env.DB.prepare(
      `SELECT r2_key, user_id FROM premium_webtoons WHERE id = ?`
    )
      .bind(imageId)
      .first()) as { r2_key: string; user_id: string } | null;

    if (!row) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (row.user_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete from R2
    try {
      await env.R2.delete(row.r2_key);
    } catch (r2Error) {
      console.error('R2 Delete Warning:', r2Error);
    }

    // Delete from DB
    await env.DB.prepare(`DELETE FROM premium_webtoons WHERE id = ?`)
      .bind(imageId)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Premium/Gallery] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!env.DB) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const row = await env.DB.prepare(
      `SELECT user_id, source_image_ids FROM generated_images WHERE id = ?`
    ).bind(id).first() as any;

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (userId && row.user_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    let sourceImageIds: string[] = [];
    if (row.source_image_ids) {
      try {
        sourceImageIds = JSON.parse(row.source_image_ids);
      } catch { /* invalid JSON */ }
    }

    return NextResponse.json({ sourceImageIds });
  } catch (error) {
    console.error('[Gallery/SourceImages] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch source images' }, { status: 500 });
  }
}

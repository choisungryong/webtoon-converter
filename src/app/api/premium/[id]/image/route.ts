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

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Look up in generated_images (premium images stored with type='premium')
    const row = (await env.DB.prepare(
      `SELECT r2_key FROM generated_images WHERE id = ?`
    )
      .bind(id)
      .first()) as { r2_key: string } | null;

    if (!row) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Fetch from R2
    const object = await env.R2.get(row.r2_key);

    if (!object) {
      return NextResponse.json(
        { error: 'Image file not found' },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      object.httpMetadata?.contentType || 'image/png'
    );
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error('[Premium/Image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

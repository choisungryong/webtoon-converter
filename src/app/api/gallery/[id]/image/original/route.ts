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
        { error: 'Bindings not available' },
        { status: 500 }
      );
    }

    const stmt = await env.DB.prepare(
      `SELECT original_r2_key FROM generated_images WHERE id = ?`
    ).bind(id);
    const result = await stmt.first();

    if (!result || !result.original_r2_key) {
      return NextResponse.json(
        { error: 'Original image not found' },
        { status: 404 }
      );
    }

    const r2Key = result.original_r2_key as string;
    const object = await env.R2.get(r2Key);

    if (!object) {
      return NextResponse.json(
        { error: 'Image file not found in storage' },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      object.httpMetadata?.contentType || 'image/png'
    );
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Original Image Serve Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const { id } = await params;

    // Verify userId for ownership check
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Bindings not available' },
        { status: 500 }
      );
    }

    // Get image info from DB
    const stmt = await env.DB.prepare(
      `SELECT * FROM generated_images WHERE id = ?`
    ).bind(id);
    const result = await stmt.first();

    if (!result) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Ownership check: only allow deletion of own images
    if (result.user_id && result.user_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete from R2 (Attempt, but don't fail operation if file missing)
    try {
      if (result.r2_key) {
        await env.R2.delete(result.r2_key as string);
      }
      if (result.original_r2_key) {
        await env.R2.delete(result.original_r2_key as string);
      }
    } catch (r2Error) {
      console.error('R2 Delete Warning:', r2Error);
    }

    // Delete from D1
    const res = await env.DB.prepare(
      `DELETE FROM generated_images WHERE id = ?`
    )
      .bind(id)
      .run();

    if (!res.success) {
      throw new Error('Failed to delete from database');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

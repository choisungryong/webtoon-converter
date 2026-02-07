import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    if (env.DB) {
      // Verify the record is in 'uploaded' state before completing
      const existing = await env.DB.prepare(
        `SELECT status FROM videos WHERE id = ?`
      ).bind(fileId).first();

      if (!existing) {
        return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
      }
      if (existing.status !== 'uploaded') {
        return NextResponse.json({ error: 'Invalid state transition' }, { status: 409 });
      }

      await env.DB.prepare(`UPDATE videos SET status = ? WHERE id = ?`)
        .bind('completed', fileId)
        .run();
    }

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error('Upload Complete Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}

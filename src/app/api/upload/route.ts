import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    const r2Key = formData.get('r2Key') as string;

    if (!file || !fileId || !r2Key) {
      return NextResponse.json(
        { error: 'Missing file, fileId, or r2Key' },
        { status: 400 }
      );
    }

    if (!env.R2) {
      return NextResponse.json({ error: 'R2 binding failed' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    if (env.DB) {
      // Verify the record exists and is in 'pending' state
      const existing = await env.DB.prepare(
        `SELECT status FROM videos WHERE id = ?`
      ).bind(fileId).first();

      if (!existing) {
        return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
      }
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: 'File already uploaded' }, { status: 409 });
      }

      await env.DB.prepare(`UPDATE videos SET status = ? WHERE id = ?`)
        .bind('uploaded', fileId)
        .run();
    }

    return NextResponse.json({ success: true, fileId, r2Key });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

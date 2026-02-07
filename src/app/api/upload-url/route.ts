import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../utils/commonUtils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const { filename, fileType } = await request.json();

    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'Filename and file type are required' },
        { status: 400 }
      );
    }

    if (!env.DB) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const fileId = generateUUID();
    const r2Key = `uploads/${Date.now()}-${filename}`;

    await env.DB.prepare(
      `INSERT INTO videos (id, filename, status, r2_key) VALUES (?, ?, ?, ?)`
    )
      .bind(fileId, filename, 'pending', r2Key)
      .run();

    return NextResponse.json({
      success: true,
      fileId,
      r2Key,
      uploadEndpoint: '/api/upload',
      message: 'Use POST to /api/upload with file and fileId in FormData',
    });
  } catch (error) {
    console.error('Upload URL Error:', error);
    return NextResponse.json(
      { error: 'Upload preparation failed' },
      { status: 500 }
    );
  }
}

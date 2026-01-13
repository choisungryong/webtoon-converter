import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Note: Presigned URL generation requires AWS SDK S3 API which is not Edge-compatible.
// Alternative: Use direct upload through our API endpoint instead.

export async function POST(request: NextRequest) {
    try {
        const { getRequestContext } = await import('@cloudflare/next-on-pages');
        const { env } = getRequestContext() as { env: CloudflareEnv };

        const { filename, fileType } = await request.json();

        if (!filename || !fileType) {
            return NextResponse.json({ error: '파일명과 타입이 필요합니다.' }, { status: 400 });
        }

        if (!env.DB) {
            return NextResponse.json({ error: 'DB 설정이 누락되었습니다.' }, { status: 500 });
        }

        // Generate file ID and key
        const fileId = crypto.randomUUID();
        const r2Key = `uploads/${Date.now()}-${filename}`;

        // Insert into D1 (pending status)
        await env.DB.prepare(
            `INSERT INTO videos (id, filename, status, r2_key) VALUES (?, ?, ?, ?)`
        ).bind(fileId, filename, 'pending', r2Key).run();

        // Return upload endpoint info
        // Client should POST to /api/upload with the file and fileId
        return NextResponse.json({
            success: true,
            fileId,
            r2Key,
            uploadEndpoint: '/api/upload',
            message: 'Use POST to /api/upload with file and fileId in FormData'
        });

    } catch (error) {
        console.error('Upload URL Error:', error);
        return NextResponse.json({
            error: `준비 실패: ${(error as Error).message}`
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { getRequestContext } = await import('@cloudflare/next-on-pages');
        const { env } = getRequestContext() as { env: CloudflareEnv };
        const { id } = await params;

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'Bindings not available' }, { status: 500 });
        }

        // DB에서 이미지 정보 조회
        const stmt = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE id = ?`
        ).bind(id);
        const result = await stmt.first();

        if (!result) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // R2에서 이미지 가져오기
        const r2Key = result.r2_key as string;
        const object = await env.R2.get(r2Key);

        if (!object) {
            return NextResponse.json({ error: 'Image file not found in storage' }, { status: 404 });
        }

        // 이미지 데이터 반환
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(object.body, {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Image Serve Error:', error);
        return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
    }
}

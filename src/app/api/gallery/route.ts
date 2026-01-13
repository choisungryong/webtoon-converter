import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        // 동적 import로 Edge 호환성 확보
        const { getRequestContext } = await import('@cloudflare/next-on-pages');
        const { env } = getRequestContext() as { env: CloudflareEnv };

        const userId = request.headers.get('x-user-id');

        if (!env.DB) {
            return NextResponse.json({ error: 'DB binding failed' }, { status: 500 });
        }

        let results;

        if (userId) {
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
            ).bind(userId);
            results = (await stmt.all()).results;
        } else {
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50`
            );
            results = (await stmt.all()).results;
        }

        if (!results || results.length === 0) {
            return NextResponse.json({ images: [] });
        }

        // R2 네이티브 바인딩으로 이미지 URL 생성
        // Cloudflare R2는 직접 public URL을 제공하지 않으므로,
        // 별도의 이미지 서빙 엔드포인트(/api/image/[id])를 사용하거나
        // 이미지를 base64로 인라인 제공해야 함
        // 여기서는 간단히 이미지 서빙 경로를 반환
        const imagesWithUrls = results.map((img: any) => ({
            id: img.id,
            url: `/api/gallery/${img.id}/image`,
            createdAt: img.created_at,
            prompt: img.prompt
        }));

        return NextResponse.json({ images: imagesWithUrls });

    } catch (error) {
        console.error('Gallery Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery', message: (error as Error).message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();
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

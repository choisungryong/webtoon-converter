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

        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'image';

        let results;

        if (userId) {
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50`
            ).bind(userId, type);
            results = (await stmt.all()).results;
        } else {
            // Anonymous users can only see their own images (filtered by userId which is passed in header)
            // But if userId is missing (should not happen if client sends it), we return empty or public ones?
            // Existing logic seemed to return "non-user" images if userId was missing, but let's stick to the logic.
            // Wait, existing logic was: if (userId) ... else ... WHERE user_id IS NULL
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id IS NULL AND type = ? ORDER BY created_at DESC LIMIT 50`
            ).bind(type);
            results = (await stmt.all()).results;
        }

        if (!results || results.length === 0) {
            return NextResponse.json({ images: [] });
        }

        const imagesWithUrls = results.map((img: any) => ({
            id: img.id,
            url: `/api/gallery/${img.id}/image`,
            original_url: img.original_r2_key ? `/api/gallery/${img.id}/image/original` : null,
            createdAt: img.created_at,
            prompt: img.prompt,
            type: img.type
        }));

        return NextResponse.json({ images: imagesWithUrls });

    } catch (error) {
        console.error('Gallery Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery', message: (error as Error).message }, { status: 500 });
    }
}

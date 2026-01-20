import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: Fetch premium webtoons for user
export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Get user ID from query params
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Fetch premium webtoons for user
        const result = await env.DB.prepare(
            `SELECT id, r2_key, source_webtoon_id, created_at as createdAt 
             FROM premium_webtoons 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`
        ).bind(userId).all();

        const images = (result.results || []).map((row: any) => ({
            id: row.id,
            r2_key: row.r2_key,
            source_webtoon_id: row.source_webtoon_id,
            createdAt: row.createdAt,
            url: `https://pub-5a40adc9e21a4024b93d7f0c6ca2a049.r2.dev/${row.r2_key}`
        }));

        return NextResponse.json({ images });

    } catch (error) {
        console.error('[Premium/Gallery] GET Error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}

// DELETE: Delete a premium webtoon
export async function DELETE(request: NextRequest) {
    try {
        const { env } = getRequestContext();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const imageId = searchParams.get('id');

        if (!imageId) {
            return NextResponse.json({ error: 'Missing image ID' }, { status: 400 });
        }

        // Get the R2 key first
        const row = await env.DB.prepare(
            `SELECT r2_key FROM premium_webtoons WHERE id = ?`
        ).bind(imageId).first() as { r2_key: string } | null;

        if (!row) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete from R2
        await env.R2.delete(row.r2_key);

        // Delete from DB
        await env.DB.prepare(
            `DELETE FROM premium_webtoons WHERE id = ?`
        ).bind(imageId).run();

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Premium/Gallery] DELETE Error:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

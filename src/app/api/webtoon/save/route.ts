import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const { env } = getRequestContext();
        const body = await request.json() as { image: string, userId: string };
        const { image, userId } = body;

        if (!image || !userId) {
            return NextResponse.json({ error: 'Missing image or userId' }, { status: 400 });
        }

        // Validate bindings
        if (!env.R2 || !env.DB) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
        }

        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        // Save to R2
        const imageId = crypto.randomUUID();
        const r2Key = `webtoons/${imageId}.${base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1]}`;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        await env.R2.put(r2Key, bytes, {
            httpMetadata: { contentType: mimeType }
        });

        // Save to DB
        await env.DB.prepare(
            `INSERT INTO generated_images (id, r2_key, type, user_id) VALUES (?, ?, ?, ?)`
        ).bind(imageId, r2Key, 'webtoon', userId).run();

        return NextResponse.json({ success: true, imageId });

    } catch (error) {
        console.error('Webtoon Save Error:', error);
        return NextResponse.json({ error: 'Failed to save webtoon' }, { status: 500 });
    }
}

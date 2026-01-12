import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'DB or R2 binding missing' }, { status: 500 });
        }

        // 1. Get image info from D1
        const image = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE id = ?`
        ).bind(id).first();

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // 2. Delete from R2
        try {
            await env.R2.delete(image.r2_key as string);
        } catch (r2Error) {
            console.error('R2 delete error:', r2Error);
            // Continue even if R2 delete fails
        }

        // 3. Delete from D1
        await env.DB.prepare(
            `DELETE FROM generated_images WHERE id = ?`
        ).bind(id).run();

        return NextResponse.json({ success: true, message: 'Image deleted' });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}

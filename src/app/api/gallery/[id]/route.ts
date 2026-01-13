import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { env } = await getCloudflareContext();
        const { id } = await params;

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'Bindings not available' }, { status: 500 });
        }

        // Get image info from DB
        const stmt = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE id = ?`
        ).bind(id);
        const result = await stmt.first();

        if (!result) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete from R2
        const r2Key = result.r2_key as string;
        await env.R2.delete(r2Key);

        // Delete from D1
        await env.DB.prepare(
            `DELETE FROM generated_images WHERE id = ?`
        ).bind(id).run();

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}

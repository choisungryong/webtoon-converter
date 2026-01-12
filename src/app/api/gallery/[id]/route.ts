import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = request.headers.get('x-user-id');

        if (!id) {
            return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'DB or R2 binding missing' }, { status: 500 });
        }

        // 1. Get image info from D1
        // Using explicit casting for safety
        const result = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE id = ?`
        ).bind(id).first();

        const image = result as { id: string, r2_key: string, user_id?: string } | null;

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // 2. Check Ownership
        if (image.user_id) {
            if (image.user_id !== userId) {
                return NextResponse.json({ error: 'Unauthorized: You can only delete your own images' }, { status: 403 });
            }
        } else {
            // If image has NO user_id (legacy), allow delete only if requester also provides NO user_id?
            // Or allow anyone? For safety, let's treat legacy images as "Admins only" or "Public"?
            // Let's protect them: if accessing via filtered view, you shouldn't see them anyway.
            // But if you see them (in public view), maybe let's allow delete for now to clean up.
            // ... Actually, better to RESTRICT.
            // If I created it anonymously before, I might want to delete it.
            // But new strict mode: Only match. 
            // If image.user_id is NULL, and I send a userId, mismatch -> 403.
            // If image.user_id is NULL, and I send NO userId, match -> Allow.
            if (userId) {
                return NextResponse.json({ error: 'Unauthorized: Cannot delete legacy/public images' }, { status: 403 });
            }
        }

        // 3. Delete from R2
        try {
            await env.R2.delete(image.r2_key);
        } catch (r2Error) {
            console.error('R2 delete error:', r2Error);
        }

        // 4. Delete from D1
        await env.DB.prepare(
            `DELETE FROM generated_images WHERE id = ?`
        ).bind(id).run();

        return NextResponse.json({ success: true, message: 'Image deleted' });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'DB or R2 binding failed' }, { status: 500 });
        }

        const { results } = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE user_id IS NULL`
        ).all();

        const legacyImages = results as { id: string, r2_key: string }[];
        const count = legacyImages.length;

        let deletedR2 = 0;
        if (count > 0) {
            const deletePromises = legacyImages.map(async (img) => {
                try {
                    await env.R2.delete(img.r2_key);
                    deletedR2++;
                } catch (e) {
                    console.error(`Failed to delete R2 object: ${img.r2_key}`, e);
                }
            });
            await Promise.all(deletePromises);

            await env.DB.prepare(
                `DELETE FROM generated_images WHERE user_id IS NULL`
            ).run();
        }

        return NextResponse.json({
            success: true,
            message: `Cleanup Complete.`,
            details: { deletedLegacyImages: deletedR2 }
        });

    } catch (error) {
        console.error('Cleanup Error:', error);
        return NextResponse.json({ error: `Cleanup failed: ${(error as Error).message}` }, { status: 500 });
    }
}

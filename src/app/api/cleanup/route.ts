import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const ORIGINAL_PHOTO_TTL_DAYS = 3;

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    // Require admin password for cleanup
    const url = new URL(request.url);
    const password = url.searchParams.get('key');
    const adminPassword = env.QNA_ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'DB or R2 binding failed' },
        { status: 500 }
      );
    }

    // 1. Clean up legacy images (no user_id)
    const { results } = await env.DB.prepare(
      `SELECT * FROM generated_images WHERE user_id IS NULL`
    ).all();

    const legacyImages = results as { id: string; r2_key: string }[];

    let deletedLegacy = 0;
    if (legacyImages.length > 0) {
      const deletePromises = legacyImages.map(async (img) => {
        try {
          await env.R2.delete(img.r2_key);
          deletedLegacy++;
        } catch (e) {
          console.error(`Failed to delete R2 object: ${img.r2_key}`, e);
        }
      });
      await Promise.all(deletePromises);

      await env.DB.prepare(
        `DELETE FROM generated_images WHERE user_id IS NULL`
      ).run();
    }

    // 2. Clean up expired original photos (older than 3 days)
    // Timestamp format: app code uses Date.now() (milliseconds),
    // schema default uses strftime('%s') (seconds).
    // Detect format: values > 9999999999 (~Nov 2286 in seconds) are milliseconds.
    const cutoffMs = Date.now() - ORIGINAL_PHOTO_TTL_DAYS * 24 * 60 * 60 * 1000;
    const cutoffSec = Math.floor(cutoffMs / 1000);

    const { results: expiredOriginals } = await env.DB.prepare(
      `SELECT id, original_r2_key FROM generated_images
       WHERE original_r2_key IS NOT NULL
       AND (
         (created_at > 9999999999 AND created_at < ?)
         OR (created_at <= 9999999999 AND created_at < ?)
       )`
    ).bind(cutoffMs, cutoffSec).all();

    const expired = expiredOriginals as { id: string; original_r2_key: string }[];

    let deletedOriginals = 0;
    for (const img of expired) {
      try {
        await env.R2.delete(img.original_r2_key);
        await env.DB.prepare(
          `UPDATE generated_images SET original_r2_key = NULL WHERE id = ?`
        ).bind(img.id).run();
        deletedOriginals++;
      } catch (e) {
        console.error(`Failed to delete expired original: ${img.original_r2_key}`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup Complete.',
      details: {
        deletedLegacyImages: deletedLegacy,
        deletedExpiredOriginals: deletedOriginals,
        originalTtlDays: ORIGINAL_PHOTO_TTL_DAYS,
      },
    });
  } catch (error) {
    console.error('Cleanup Error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: Fetch premium webtoons for user
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const type = searchParams.get('type');

    // Fetch episodes if requested
    if (type === 'episodes') {
      try {
        const epResult = await env.DB.prepare(
          `SELECT id, title, story_data, panel_ids, status, created_at as createdAt
           FROM premium_episodes
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT 50`
        ).bind(userId).all();

        const episodes = (epResult.results || []).map((row: any) => {
          const panelIds: string[] = JSON.parse(row.panel_ids || '[]');
          const storyData = JSON.parse(row.story_data || '{}');
          return {
            id: row.id,
            title: row.title || storyData.title,
            panelCount: storyData.panels?.length || 0,
            status: row.status,
            thumbnailUrl: panelIds[0] ? `/api/premium/${panelIds[0]}/image` : null,
            createdAt: row.createdAt,
          };
        });

        return NextResponse.json({ episodes });
      } catch {
        // Table may not exist yet
        return NextResponse.json({ episodes: [] });
      }
    }

    // Fetch premium images from generated_images (type='premium')
    try {
      const result = await env.DB.prepare(
        `SELECT id, r2_key, created_at as createdAt
         FROM generated_images
         WHERE user_id = ? AND type = 'premium'
         ORDER BY created_at DESC
         LIMIT 50`
      )
        .bind(userId)
        .all();

      const images = (result.results || []).map((row: any) => ({
        id: row.id,
        r2_key: row.r2_key,
        createdAt: row.createdAt,
        url: `/api/premium/${row.id}/image`,
      }));

      return NextResponse.json({ images });
    } catch {
      return NextResponse.json({ images: [] });
    }
  } catch (error) {
    console.error('[Premium/Gallery] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a premium image
export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!imageId) {
      return NextResponse.json({ error: 'Missing image ID' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const row = (await env.DB.prepare(
      `SELECT r2_key, user_id FROM generated_images WHERE id = ? AND type = 'premium'`
    )
      .bind(imageId)
      .first()) as { r2_key: string; user_id: string } | null;

    if (!row) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (row.user_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
      await env.R2.delete(row.r2_key);
    } catch (r2Error) {
      console.error('R2 Delete Warning:', r2Error);
    }

    await env.DB.prepare(`DELETE FROM generated_images WHERE id = ?`)
      .bind(imageId)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Premium/Gallery] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

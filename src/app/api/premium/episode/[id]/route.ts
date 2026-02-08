import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// GET: Fetch episode details with panel image URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const { id } = await params;

    if (!env.DB) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const episode = await env.DB.prepare(
      `SELECT * FROM premium_episodes WHERE id = ? AND user_id = ?`
    ).bind(id, userId).first() as any;

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    const storyData = JSON.parse(episode.story_data);
    const panelIds: string[] = JSON.parse(episode.panel_ids || '[]');

    // Build panel data with image URLs
    const panels = storyData.panels.map((panel: any, index: number) => ({
      ...panel,
      imageId: panelIds[index] || null,
      imageUrl: panelIds[index] ? `/api/premium/${panelIds[index]}/image` : null,
    }));

    return NextResponse.json({
      id: episode.id,
      title: episode.title,
      synopsis: storyData.synopsis,
      panels,
      status: episode.status,
      sourceWebtoonId: episode.source_webtoon_id,
      createdAt: episode.created_at,
    });
  } catch (error) {
    console.error('[Episode/GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch episode' }, { status: 500 });
  }
}

// PATCH: Update episode story data (edit dialogue)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const { id } = await params;

    if (!env.DB) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = (await request.json()) as {
      userId: string;
      storyData: any;
    };

    const { userId, storyData } = body;

    if (!userId || !storyData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const episode = await env.DB.prepare(
      `SELECT user_id FROM premium_episodes WHERE id = ?`
    ).bind(id).first() as any;

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.user_id !== userId) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await env.DB.prepare(
      `UPDATE premium_episodes SET story_data = ?, title = ? WHERE id = ?`
    ).bind(JSON.stringify(storyData), storyData.title || null, id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Episode/PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 });
  }
}

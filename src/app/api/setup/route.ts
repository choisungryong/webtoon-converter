import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    if (!env.DB) {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 });
    }

    // Create tables if not exist
    await env.DB.exec(`
            CREATE TABLE IF NOT EXISTS generated_images (
                id TEXT PRIMARY KEY,
                r2_key TEXT NOT NULL,
                original_r2_key TEXT,
                type TEXT DEFAULT 'generated',
                prompt TEXT,
                user_id TEXT,
                source_image_ids TEXT,
                created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_user_id ON generated_images(user_id);
            CREATE INDEX IF NOT EXISTS idx_created_at ON generated_images(created_at);

            CREATE TABLE IF NOT EXISTS premium_episodes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT,
                story_data TEXT NOT NULL,
                source_webtoon_id TEXT,
                panel_ids TEXT DEFAULT '[]',
                status TEXT DEFAULT 'pending',
                created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_episodes_user ON premium_episodes(user_id);
        `);

    // Add columns if they don't exist (safe for existing deployments)
    try {
      await env.DB.exec(`ALTER TABLE generated_images ADD COLUMN original_r2_key TEXT;`);
    } catch { /* column already exists */ }
    try {
      await env.DB.exec(`ALTER TABLE generated_images ADD COLUMN type TEXT DEFAULT 'generated';`);
    } catch { /* column already exists */ }
    try {
      await env.DB.exec(`ALTER TABLE generated_images ADD COLUMN source_image_ids TEXT;`);
    } catch { /* column already exists */ }

    return NextResponse.json({
      success: true,
      message: 'Database tables created/verified',
    });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

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
                prompt TEXT,
                user_id TEXT,
                created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_user_id ON generated_images(user_id);
            CREATE INDEX IF NOT EXISTS idx_created_at ON generated_images(created_at);
        `);

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

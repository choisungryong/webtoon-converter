import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB) {
            return NextResponse.json({ error: 'DB binding failed' }, { status: 500 });
        }

        // Execute Schema Creation
        await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id TEXT PRIMARY KEY,
        video_id TEXT,
        r2_key TEXT NOT NULL,
        prompt TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `).run();

        // Create Index separately as D1 prepare only runs one statement usually
        try {
            await env.DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_images_created_at ON generated_images(created_at DESC);
        `).run();
        } catch (e) {
            console.log("Index might already exist");
        }

        return NextResponse.json({
            success: true,
            message: "Database initialized successfully! You can now upload files."
        });

    } catch (error) {
        console.error('Setup Error:', error);
        return NextResponse.json({ error: `Setup failed: ${(error as Error).message}` }, { status: 500 });
    }
}

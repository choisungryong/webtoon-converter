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
        // Execute Schema Creation
        await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        video_id TEXT,
        r2_key TEXT NOT NULL,
        prompt TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `).run();

        // Migration: Add user_id column if it doesn't exist
        try {
            await env.DB.prepare(`ALTER TABLE generated_images ADD COLUMN user_id TEXT;`).run();
            console.log("Added user_id column");
        } catch (e) {
            // Check if error is because column already exists
            const errMsg = (e as Error).message;
            if (!errMsg.includes("duplicate column name")) {
                console.log("Column user_id might already exist or error: " + errMsg);
            }
        }

        // Create Index separately
        try {
            await env.DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_images_created_at ON generated_images(created_at DESC);
        `).run();
        } catch (e) {
            console.log("Index might already exist");
        }

        // Create Index for user_id
        try {
            await env.DB.prepare(`
            CREATE INDEX IF NOT EXISTS idx_images_user_id ON generated_images(user_id);
        `).run();
        } catch (e) {
            console.log("User Index might already exist");
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

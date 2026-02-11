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

            CREATE TABLE IF NOT EXISTS usage_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT,
                created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
            );
            CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT,
                nickname TEXT,
                avatar_url TEXT,
                provider TEXT NOT NULL,
                provider_id TEXT NOT NULL,
                legacy_user_id TEXT,
                free_credits INTEGER DEFAULT 3,
                paid_credits INTEGER DEFAULT 0,
                free_credits_reset_at INTEGER,
                created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),
                updated_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000),
                UNIQUE(provider, provider_id)
            );
            CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
            CREATE INDEX IF NOT EXISTS idx_users_legacy ON users(legacy_user_id);

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

            CREATE TABLE IF NOT EXISTS credit_transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                credit_type TEXT NOT NULL,
                reason TEXT NOT NULL,
                reference_id TEXT,
                balance_after INTEGER NOT NULL,
                created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)
            );
            CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);

            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payment_key TEXT,
                amount INTEGER NOT NULL,
                credits INTEGER NOT NULL,
                package_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                toss_response TEXT,
                confirmed_at INTEGER,
                created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)
            );
            CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
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
      message: 'Database tables created/verified (including auth, credits, payments)',
    });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

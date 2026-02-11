import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';

export const runtime = 'edge';

/**
 * Link legacy localStorage UUID to authenticated account.
 * Migrates existing gallery data, usage logs, and episodes.
 */
export async function POST(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { legacyUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { legacyUserId } = body;
  if (!legacyUserId || typeof legacyUserId !== 'string' || legacyUserId.length > 100) {
    return NextResponse.json({ error: 'Invalid legacyUserId' }, { status: 400 });
  }

  // Already linked?
  if (user.legacy_user_id === legacyUserId) {
    return NextResponse.json({ success: true, message: 'Already linked' });
  }

  try {
    // Save legacy_user_id to user record
    await env.DB.prepare(
      `UPDATE users SET legacy_user_id = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(legacyUserId, Date.now(), user.id)
      .run();

    // Migrate existing data (batch for atomicity)
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE generated_images SET user_id = ? WHERE user_id = ?`,
      ).bind(user.id, legacyUserId),
      env.DB.prepare(
        `UPDATE usage_logs SET user_id = ? WHERE user_id = ?`,
      ).bind(user.id, legacyUserId),
      env.DB.prepare(
        `UPDATE premium_episodes SET user_id = ? WHERE user_id = ?`,
      ).bind(user.id, legacyUserId),
    ]);

    return NextResponse.json({ success: true, migrated: true });
  } catch (err) {
    console.error('[Auth/Link] Migration error:', err);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 },
    );
  }
}

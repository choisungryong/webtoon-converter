import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  try {
    const rows = await env.DB.prepare(
      `SELECT id, amount, credit_type, reason, reference_id, balance_after, created_at
       FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(user.id, limit, offset)
      .all();

    return NextResponse.json({
      transactions: rows.results || [],
      hasMore: (rows.results?.length || 0) === limit,
    });
  } catch (err) {
    console.error('[Credits/History] Error:', err);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}

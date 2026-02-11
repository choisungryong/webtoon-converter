import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { getCreditBalance } from '../../../../lib/credits';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const balance = await getCreditBalance(env.DB, user.id);
    return NextResponse.json({ credits: balance });
  } catch (err) {
    console.error('[Credits/Balance] Error:', err);
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}

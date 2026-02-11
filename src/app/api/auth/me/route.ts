import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { getCreditBalance } from '../../../../lib/credits';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();

  const user = await getUserFromRequest(request, env);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Get fresh credit balance
  let credits = { free: user.free_credits, paid: user.paid_credits, total: user.free_credits + user.paid_credits };
  try {
    credits = await getCreditBalance(env.DB, user.id);
  } catch { /* use cached values */ }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      provider: user.provider,
      credits,
    },
  });
}

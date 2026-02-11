import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import {
  parseCookies,
  verifyToken,
  validateSession,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  createSession,
  deleteUserSessions,
} from '../../../../lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const isSecure = request.url.startsWith('https');

  const cookies = parseCookies(request.headers.get('cookie'));
  const refreshToken = cookies['refresh_token'];

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const payload = await verifyToken(refreshToken, env.JWT_SECRET);
  if (!payload || payload.type !== 'refresh') {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  // Validate session in DB
  const valid = await validateSession(env.DB, payload.sub, refreshToken);
  if (!valid) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // Rotate tokens: delete old sessions, create new
  await deleteUserSessions(env.DB, payload.sub);

  const newAccessToken = await signAccessToken(payload.sub, env.JWT_SECRET);
  const newRefreshToken = await signRefreshToken(payload.sub, env.JWT_SECRET);
  await createSession(env.DB, payload.sub, newRefreshToken);

  const response = NextResponse.json({ success: true });
  for (const cookie of setAuthCookies(newAccessToken, newRefreshToken, isSecure)) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}

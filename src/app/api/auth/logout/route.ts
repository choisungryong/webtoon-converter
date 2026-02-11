import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { parseCookies, verifyToken, deleteUserSessions, clearAuthCookies } from '../../../../lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { env } = getRequestContext();
  const isSecure = request.url.startsWith('https');

  const cookies = parseCookies(request.headers.get('cookie'));
  const accessToken = cookies['access_token'];

  if (accessToken) {
    const payload = await verifyToken(accessToken, env.JWT_SECRET);
    if (payload) {
      try {
        await deleteUserSessions(env.DB, payload.sub);
      } catch { /* best effort */ }
    }
  }

  const response = NextResponse.json({ success: true });
  for (const cookie of clearAuthCookies(isSecure)) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getGoogleConfig, getCallbackUrl, exchangeCodeForToken, fetchGoogleUser } from '../../../../../lib/oauth';
import {
  parseCookies,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  createSession,
} from '../../../../../lib/auth';
import { grantSignupBonus } from '../../../../../lib/credits';
import { generateUUID } from '../../../../../utils/commonUtils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const isSecure = request.url.startsWith('https');
  const baseUrl = env.APP_URL || 'https://banatoon.app';

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=cancelled`);
  }

  // Verify CSRF state
  const cookies = parseCookies(request.headers.get('cookie'));
  if (!state || cookies['oauth_state'] !== state) {
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=invalid_state`);
  }

  try {
    const config = getGoogleConfig(env);
    const redirectUri = getCallbackUrl(env, 'google');

    const tokenRes = await exchangeCodeForToken(config, code, redirectUri);
    const googleUser = await fetchGoogleUser(tokenRes.access_token);

    const providerId = googleUser.id;
    const email = googleUser.email || null;
    const nickname = googleUser.name || null;
    const avatarUrl = googleUser.picture || null;

    let userId: string;
    let isNew = false;

    const existing = await env.DB.prepare(
      `SELECT id FROM users WHERE provider = 'google' AND provider_id = ?`,
    )
      .bind(providerId)
      .first();

    if (existing) {
      userId = existing.id as string;
      await env.DB.prepare(
        `UPDATE users SET email = ?, nickname = ?, avatar_url = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(email, nickname, avatarUrl, Date.now(), userId)
        .run();
    } else {
      userId = generateUUID();
      isNew = true;
      await env.DB.prepare(
        `INSERT INTO users (id, email, nickname, avatar_url, provider, provider_id, free_credits, paid_credits, created_at, updated_at) VALUES (?, ?, ?, ?, 'google', ?, 3, 0, ?, ?)`,
      )
        .bind(userId, email, nickname, avatarUrl, providerId, Date.now(), Date.now())
        .run();
    }

    if (isNew) {
      try {
        await grantSignupBonus(env.DB, userId);
      } catch {
        /* best effort */
      }
    }

    const accessToken = await signAccessToken(userId, env.JWT_SECRET);
    const refreshToken = await signRefreshToken(userId, env.JWT_SECRET);
    await createSession(env.DB, userId, refreshToken);

    const response = NextResponse.redirect(`${baseUrl}/ko?auth=success&new=${isNew}`);
    for (const cookie of setAuthCookies(accessToken, refreshToken, isSecure)) {
      response.headers.append('Set-Cookie', cookie);
    }
    response.headers.append(
      'Set-Cookie',
      `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );

    return response;
  } catch (err) {
    console.error('[Auth/Google] Callback error:', err);
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=server_error`);
  }
}

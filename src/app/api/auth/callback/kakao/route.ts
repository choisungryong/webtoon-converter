import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getKakaoConfig, getCallbackUrl, exchangeCodeForToken, fetchKakaoUser } from '../../../../../lib/oauth';
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

  // OAuth error or user denied
  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=cancelled`);
  }

  // Verify CSRF state
  const cookies = parseCookies(request.headers.get('cookie'));
  if (!state || cookies['oauth_state'] !== state) {
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=invalid_state`);
  }

  try {
    const config = getKakaoConfig(env);
    const redirectUri = getCallbackUrl(env, 'kakao');

    // Exchange code for token
    const tokenRes = await exchangeCodeForToken(config, code, redirectUri);

    // Get user info
    const kakaoUser = await fetchKakaoUser(tokenRes.access_token);
    const providerId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || null;
    const nickname = kakaoUser.kakao_account?.profile?.nickname || null;
    const avatarUrl = kakaoUser.kakao_account?.profile?.profile_image_url || null;

    // Upsert user
    let userId: string;
    let isNew = false;

    const existing = await env.DB.prepare(
      `SELECT id FROM users WHERE provider = 'kakao' AND provider_id = ?`,
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
        `INSERT INTO users (id, email, nickname, avatar_url, provider, provider_id, free_credits, paid_credits, created_at, updated_at) VALUES (?, ?, ?, ?, 'kakao', ?, 3, 0, ?, ?)`,
      )
        .bind(userId, email, nickname, avatarUrl, providerId, Date.now(), Date.now())
        .run();
    }

    // Grant signup bonus for new users
    if (isNew) {
      try {
        await grantSignupBonus(env.DB, userId);
      } catch {
        /* best effort */
      }
    }

    // Create tokens + session
    const accessToken = await signAccessToken(userId, env.JWT_SECRET);
    const refreshToken = await signRefreshToken(userId, env.JWT_SECRET);
    await createSession(env.DB, userId, refreshToken);

    // Redirect to home with cookies
    const response = NextResponse.redirect(`${baseUrl}/ko?auth=success&new=${isNew}`);
    for (const cookie of setAuthCookies(accessToken, refreshToken, isSecure)) {
      response.headers.append('Set-Cookie', cookie);
    }
    // Clear oauth_state cookie
    response.headers.append(
      'Set-Cookie',
      `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );

    return response;
  } catch (err) {
    console.error('[Auth/Kakao] Callback error:', err);
    return NextResponse.redirect(`${baseUrl}/ko?auth_error=server_error`);
  }
}

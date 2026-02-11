import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getKakaoConfig, getGoogleConfig, getCallbackUrl } from '../../../../lib/oauth';
import { generateState, stateToSameSiteCookie } from '../../../../lib/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (provider !== 'kakao' && provider !== 'google') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const config = provider === 'kakao' ? getKakaoConfig(env) : getGoogleConfig(env);
  const redirectUri = getCallbackUrl(env, provider);
  const state = generateState();
  const isSecure = request.url.startsWith('https');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });

  // Google needs access_type=offline for refresh tokens
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  const authUrl = `${config.authUrl}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.headers.append('Set-Cookie', stateToSameSiteCookie(state, isSecure));
  return response;
}

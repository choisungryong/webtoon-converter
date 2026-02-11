// OAuth provider configuration

export interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export function getKakaoConfig(env: any): OAuthProviderConfig {
  return {
    authUrl: 'https://kauth.kakao.com/oauth/authorize',
    tokenUrl: 'https://kauth.kakao.com/oauth/token',
    userInfoUrl: 'https://kapi.kakao.com/v2/user/me',
    clientId: env.KAKAO_CLIENT_ID || '',
    clientSecret: env.KAKAO_CLIENT_SECRET || '',
    scope: 'profile_nickname profile_image account_email',
  };
}

export function getGoogleConfig(env: any): OAuthProviderConfig {
  return {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    scope: 'openid email profile',
  };
}

export function getCallbackUrl(env: any, provider: string): string {
  const baseUrl = env.APP_URL || 'https://banatoon.app';
  return `${baseUrl}/api/auth/callback/${provider}`;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeCodeForToken(
  config: OAuthProviderConfig,
  code: string,
  redirectUri: string,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}

export interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

export interface GoogleUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function fetchKakaoUser(accessToken: string): Promise<KakaoUserInfo> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Kakao userinfo failed: ${res.status}`);
  return res.json() as Promise<KakaoUserInfo>;
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return res.json() as Promise<GoogleUserInfo>;
}

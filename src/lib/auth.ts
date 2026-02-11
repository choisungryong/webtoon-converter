import jwt from '@tsndr/cloudflare-worker-jwt';
import { generateUUID } from '../utils/commonUtils';

// ---------- Types ----------

export interface AuthUser {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  provider: 'kakao' | 'google';
  legacy_user_id: string | null;
  free_credits: number;
  paid_credits: number;
  free_credits_reset_at: number | null;
}

interface TokenPayload {
  sub: string; // user id
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

// ---------- Constants ----------

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const COOKIE_OPTIONS_BASE = 'Path=/; HttpOnly; SameSite=Lax';

function cookieOptions(secure: boolean): string {
  return secure ? `${COOKIE_OPTIONS_BASE}; Secure` : COOKIE_OPTIONS_BASE;
}

// ---------- JWT helpers ----------

export async function signAccessToken(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: userId, iat: now, exp: now + ACCESS_TOKEN_TTL, type: 'access' },
    secret,
  );
}

export async function signRefreshToken(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: userId, iat: now, exp: now + REFRESH_TOKEN_TTL, type: 'refresh' },
    secret,
  );
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const valid = await jwt.verify(token, secret);
    if (!valid) return null;
    const { payload } = jwt.decode(token);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ---------- Cookie helpers ----------

export function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  isSecure: boolean,
): string[] {
  const opts = cookieOptions(isSecure);
  return [
    `access_token=${accessToken}; ${opts}; Max-Age=${ACCESS_TOKEN_TTL}`,
    `refresh_token=${refreshToken}; ${opts}; Max-Age=${REFRESH_TOKEN_TTL}`,
  ];
}

export function clearAuthCookies(isSecure: boolean): string[] {
  const opts = cookieOptions(isSecure);
  return [
    `access_token=; ${opts}; Max-Age=0`,
    `refresh_token=; ${opts}; Max-Age=0`,
  ];
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

// ---------- Session helpers ----------

export async function createSession(
  db: any,
  userId: string,
  refreshToken: string,
): Promise<void> {
  const sessionId = generateUUID();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(refreshToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL * 1000;

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(sessionId, userId, tokenHash, expiresAt, Date.now())
    .run();
}

export async function validateSession(
  db: any,
  userId: string,
  refreshToken: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(refreshToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const row = await db
    .prepare(
      `SELECT id FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > ?`,
    )
    .bind(userId, tokenHash, Date.now())
    .first();
  return !!row;
}

export async function deleteUserSessions(db: any, userId: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}

// ---------- User from request ----------

export async function getUserFromRequest(
  request: Request,
  env: { DB: any; JWT_SECRET: string },
): Promise<AuthUser | null> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const accessToken = cookies['access_token'];
  if (!accessToken) return null;

  const payload = await verifyToken(accessToken, env.JWT_SECRET);
  if (!payload || payload.type !== 'access') return null;

  try {
    const row = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`)
      .bind(payload.sub)
      .first();
    if (!row) return null;
    return {
      id: row.id as string,
      email: row.email as string | null,
      nickname: row.nickname as string | null,
      avatar_url: row.avatar_url as string | null,
      provider: row.provider as 'kakao' | 'google',
      legacy_user_id: row.legacy_user_id as string | null,
      free_credits: (row.free_credits as number) ?? 3,
      paid_credits: (row.paid_credits as number) ?? 0,
      free_credits_reset_at: row.free_credits_reset_at as number | null,
    };
  } catch {
    return null;
  }
}

// ---------- CSRF state ----------

export function generateState(): string {
  return generateUUID();
}

export function stateToSameSiteCookie(state: string, isSecure: boolean): string {
  const opts = cookieOptions(isSecure);
  return `oauth_state=${state}; ${opts}; Max-Age=600`;
}

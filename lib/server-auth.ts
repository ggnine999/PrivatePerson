import { env } from 'cloudflare:workers';
import { isAttemptAllowed } from '@/lib/rate-limit-policy';
import { cookies, headers } from 'next/headers';
import {
  randomToken,
  sha256,
  verifyPassword,
  verifyTotp,
} from '@/lib/security';

const COOKIE = 'starry_owner_session';
const DEMO_USER = 'demo-owner';
const DEMO_PASSWORD = 'Sakura-Demo-2026!';
const LOGIN_WINDOW_MS = 15 * 60_000;
const MAX_LOGIN_ATTEMPTS = 5;

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

function runtime(name: string) {
  return (
    (env as unknown as Record<string, string | undefined>)[name] ??
    process.env[name]
  );
}

export async function clientKey() {
  const requestHeaders = await headers();
  const cloudflareAddress = requestHeaders.get('cf-connecting-ip')?.trim();
  const forwardedAddress = requestHeaders
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const production = runtime('NODE_ENV') === 'production';
  const address =
    cloudflareAddress ||
    (!production ? forwardedAddress : undefined) ||
    'unidentified-client';
  return sha256(address);
}

export async function reserveLoginAttempt(key: string) {
  const now = Date.now();
  const cutoff = now - LOGIN_WINDOW_MS;
  const row = await db()
    .prepare(
      `INSERT INTO login_attempts (client_key, window_start, attempts)
       VALUES (?, ?, 1)
       ON CONFLICT(client_key) DO UPDATE SET
         window_start = CASE
           WHEN login_attempts.window_start <= ? THEN excluded.window_start
           ELSE login_attempts.window_start
         END,
         attempts = CASE
           WHEN login_attempts.window_start <= ? THEN 1
           ELSE login_attempts.attempts + 1
         END
       RETURNING attempts`,
    )
    .bind(key, now, cutoff, cutoff)
    .first<{ attempts: number }>();

  return Boolean(row && isAttemptAllowed(row.attempts, MAX_LOGIN_ATTEMPTS));
}

export async function clearLoginAttempts(key: string) {
  await db()
    .prepare('DELETE FROM login_attempts WHERE client_key = ?')
    .bind(key)
    .run();
}

export async function validateOwner(
  username: string,
  password: string,
  otp?: string,
) {
  const configuredUser = runtime('OWNER_LOGIN');
  const configuredHash = runtime('OWNER_PASSWORD_HASH');
  const production = runtime('NODE_ENV') === 'production';
  const userOk =
    configuredUser && configuredHash
      ? username === configuredUser
      : !production && username === DEMO_USER;
  const passwordOk = configuredHash
    ? await verifyPassword(password, configuredHash)
    : !production && password === DEMO_PASSWORD;
  if (!userOk || !passwordOk) return false;
  const secret = runtime('OWNER_TOTP_SECRET');
  return secret ? Boolean(otp && (await verifyTotp(secret, otp))) : true;
}

function sessionTtlMilliseconds() {
  const configuredMinutes = Number(runtime('SESSION_TTL_MINUTES') ?? '480');
  const safeMinutes = Number.isFinite(configuredMinutes)
    ? Math.min(Math.max(configuredMinutes, 5), 7 * 24 * 60)
    : 480;
  return safeMinutes * 60_000;
}

export async function createSession() {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const csrfToken = randomToken(24);
  const now = Date.now();
  const ttl = sessionTtlMilliseconds();
  const database = db();

  await database.batch([
    database
      .prepare('DELETE FROM owner_sessions WHERE expires_at < ?')
      .bind(now),
    database
      .prepare(
        'INSERT INTO owner_sessions (token_hash, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(tokenHash, csrfToken, now + ttl, now),
  ]);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: runtime('NODE_ENV') === 'production',
    path: '/',
    maxAge: Math.floor(ttl / 1000),
  });
  return csrfToken;
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const hash = await sha256(token);
  const session = await db()
    .prepare(
      'SELECT token_hash, csrf_token, expires_at FROM owner_sessions WHERE token_hash = ?',
    )
    .bind(hash)
    .first<{ token_hash: string; csrf_token: string; expires_at: number }>();
  if (!session || session.expires_at < Date.now()) return null;
  return session;
}

export async function requireApiSession(request: Request, csrf = false) {
  const session = await getSession();
  if (!session) return null;
  if (
    csrf &&
    !safeHeader(request.headers.get('x-csrf-token'), session.csrf_token)
  )
    return null;
  return session;
}

function safeHeader(a: string | null, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await db()
      .prepare('DELETE FROM owner_sessions WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  jar.delete(COOKIE);
}

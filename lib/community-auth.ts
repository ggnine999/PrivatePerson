import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import {
  derivePasswordHash,
  randomToken,
  sha256,
  verifyPassword,
} from '@/lib/security';

const COOKIE = 'starry_community_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;
const PBKDF2_ITERATIONS = 120_000;

export type CommunityUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  status: 'active' | 'banned';
  createdAt: number;
};

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

function secureCookies() {
  return runtime('NODE_ENV') === 'production';
}

export function validateCommunityUsername(username: string) {
  return /^[a-z0-9_-]{3,20}$/.test(username);
}

export function validateCommunityPassword(password: string) {
  return password.length >= 8 && password.length <= 72;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? value.replace(/\p{C}/gu, ' ').trim().slice(0, maxLength)
    : '';
}

export function cleanCommunityText(value: unknown, maxLength: number) {
  return cleanText(value, maxLength);
}

export async function countPublishedCommentsByUser(userId: string) {
  const row = await db()
    .prepare(
      `SELECT COUNT(*) AS count FROM article_comments
       WHERE author_user_id = ? AND status = 'published'`,
    )
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function communityUsernameTaken(username: string) {
  const row = await db()
    .prepare('SELECT id FROM community_users WHERE username = ?')
    .bind(username)
    .first<{ id: string }>();
  return Boolean(row);
}

export async function createCommunityUser(
  username: string,
  password: string,
  displayName: string,
) {
  const salt = randomToken(16);
  const passwordHash = [
    PBKDF2_ITERATIONS,
    salt,
    await derivePasswordHash(password, salt, PBKDF2_ITERATIONS),
  ].join('$');
  const id = randomToken();
  const now = Date.now();
  await db()
    .prepare(
      `INSERT INTO community_users (id, username, password_hash, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, username, passwordHash, displayName, now)
    .run();
  return { id, username, displayName, createdAt: now };
}

export async function findCommunityUserByUsername(username: string) {
  return db()
    .prepare(
      `SELECT id, username, password_hash, display_name, avatar, bio, status, created_at
       FROM community_users WHERE username = ?`,
    )
    .bind(username)
    .first<{
      id: string;
      username: string;
      password_hash: string;
      display_name: string;
      avatar: string | null;
      bio: string | null;
      status: string;
      created_at: number;
    }>();
}

export async function verifyCommunityPassword(
  password: string,
  passwordHash: string,
) {
  return verifyPassword(password, passwordHash);
}

export async function createCommunitySession(userId: string) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const csrfToken = randomToken(24);
  const now = Date.now();
  const database = db();

  await database.batch([
    database
      .prepare('DELETE FROM community_sessions WHERE expires_at < ?')
      .bind(now),
    database
      .prepare(
        `INSERT INTO community_sessions (token_hash, user_id, csrf_token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(tokenHash, userId, csrfToken, now + SESSION_TTL_MS, now),
  ]);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: secureCookies(),
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return csrfToken;
}

export type CommunitySessionUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  csrfToken: string;
};

export async function getCommunitySessionUser(): Promise<
  CommunitySessionUser | null
> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await db()
    .prepare(
      `SELECT s.csrf_token, s.expires_at,
              u.id, u.username, u.display_name, u.avatar, u.bio, u.status
       FROM community_sessions s
       JOIN community_users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{
      csrf_token: string;
      expires_at: number;
      id: string;
      username: string;
      display_name: string;
      avatar: string | null;
      bio: string | null;
      status: string;
    }>();
  if (!row || row.expires_at < Date.now() || row.status !== 'active') {
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    bio: row.bio,
    csrfToken: row.csrf_token,
  };
}

export async function requireCommunityUser(
  request: Request,
  csrf = false,
): Promise<CommunitySessionUser | null> {
  const user = await getCommunitySessionUser();
  if (!user) return null;
  if (csrf) {
    const header = request.headers.get('x-community-csrf');
    if (!header || header.length !== user.csrfToken.length) return null;
    let diff = 0;
    for (let i = 0; i < header.length; i++) {
      diff |= header.charCodeAt(i) ^ user.csrfToken.charCodeAt(i);
    }
    if (diff !== 0) return null;
  }
  return user;
}

export async function destroyCommunitySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db()
      .prepare('DELETE FROM community_sessions WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  }
  jar.delete(COOKIE);
}

export async function updateCommunityProfile(
  userId: string,
  patch: { displayName?: string; bio?: string; avatar?: string | null },
) {
  const sets: string[] = [];
  const binds: (string | null)[] = [];
  if (patch.displayName !== undefined) {
    sets.push('display_name = ?');
    binds.push(patch.displayName);
  }
  if (patch.bio !== undefined) {
    sets.push('bio = ?');
    binds.push(patch.bio);
  }
  if (patch.avatar !== undefined) {
    sets.push('avatar = ?');
    binds.push(patch.avatar);
  }
  if (sets.length === 0) return;
  binds.push(userId);
  await db()
    .prepare(`UPDATE community_users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
}

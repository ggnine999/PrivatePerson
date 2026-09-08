import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import {
  createCommunitySession,
  findCommunityUserByUsername,
  verifyCommunityPassword,
} from '@/lib/community-auth';

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const username =
    typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: '请填写用户名和密码' }, { status: 400 });
  }

  const key = await clientKey();
  if (
    !(await consumeRateLimit(
      'community-login',
      key,
      LOGIN_LIMIT,
      LOGIN_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: '尝试次数太多，请 15 分钟后再来' },
      { status: 429 },
    );
  }

  const user = await findCommunityUserByUsername(username);
  const passwordOk = user
    ? await verifyCommunityPassword(password, user.password_hash)
    : false;
  if (!user || !passwordOk || user.status !== 'active') {
    return NextResponse.json({ error: '用户名或密码不对' }, { status: 401 });
  }

  const csrfToken = await createCommunitySession(user.id);
  return NextResponse.json({
    user: {
      username: user.username,
      displayName: user.display_name,
      permission: user.permission === 1 ? 1 : 0,
    },
    csrfToken,
  });
}

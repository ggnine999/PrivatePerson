import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import {
  cleanCommunityText,
  communityUsernameTaken,
  createCommunitySession,
  createCommunityUser,
  validateCommunityPassword,
  validateCommunityUsername,
} from '@/lib/community-auth';

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60_000;

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
  const displayName =
    cleanCommunityText(input.displayName, 20) || username;

  if (!validateCommunityUsername(username)) {
    return NextResponse.json(
      { error: '用户名需 3-20 位字母或数字' },
      { status: 400 },
    );
  }
  if (!validateCommunityPassword(password)) {
    return NextResponse.json(
      { error: '密码需要 8-72 个字符' },
      { status: 400 },
    );
  }

  const key = await clientKey();
  if (
    !(await consumeRateLimit(
      'community-register',
      key,
      REGISTER_LIMIT,
      REGISTER_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: '注册太频繁，请一小时后再试' },
      { status: 429 },
    );
  }

  if (await communityUsernameTaken(username)) {
    return NextResponse.json({ error: '这个用户名已经被使用了' }, { status: 409 });
  }

  const user = await createCommunityUser(username, password, displayName);
  const csrfToken = await createCommunitySession(user.id);
  return NextResponse.json({
    user: { username: user.username, displayName: user.displayName },
    csrfToken,
  });
}

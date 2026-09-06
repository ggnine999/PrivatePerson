import { NextResponse } from 'next/server';
import { adjustArticleLikes } from '@/lib/article-stats';
import { clientKey } from '@/lib/server-auth';
import { consumeRateLimit } from '@/lib/rate-limit';

const LIKE_LIMIT = 30;
const LIKE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as { slug?: unknown; delta?: unknown };
  const slug = typeof input.slug === 'string' ? input.slug : '';
  const delta = input.delta === -1 ? -1 : 1;
  if (!slug) {
    return NextResponse.json({ error: '缺少文章标识' }, { status: 400 });
  }
  const key = await clientKey();
  if (!(await consumeRateLimit('article-like', key, LIKE_LIMIT, LIKE_WINDOW_MS))) {
    return NextResponse.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
  }
  const stats = await adjustArticleLikes(slug, delta);
  if (!stats) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  return NextResponse.json({ stats });
}

import { NextResponse } from 'next/server';
import { setArticleLike } from '@/lib/article-stats';
import { clientKey } from '@/lib/server-auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { articleInteractionId } from '@/lib/article-interaction';

const LIKE_LIMIT = 20;
const LIKE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as { slug?: unknown; liked?: unknown };
  const slug = typeof input.slug === 'string' ? input.slug : '';
  if (!slug || typeof input.liked !== 'boolean') {
    return NextResponse.json({ error: '点赞参数不合法' }, { status: 400 });
  }
  const key = await clientKey();
  if (
    !(await consumeRateLimit('article-like', key, LIKE_LIMIT, LIKE_WINDOW_MS))
  ) {
    return NextResponse.json(
      { error: '操作太频繁，请稍后再试' },
      { status: 429 },
    );
  }
  const interactionId = await articleInteractionId('like', slug, key);
  const result = await setArticleLike(slug, interactionId, input.liked);
  if (!result) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  return NextResponse.json(result);
}

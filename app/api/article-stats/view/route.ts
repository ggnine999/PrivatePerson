import { NextResponse } from 'next/server';
import { recordArticleView } from '@/lib/article-stats';
import { clientKey } from '@/lib/server-auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { articleInteractionId } from '@/lib/article-interaction';

const VIEW_LIMIT = 30;
const VIEW_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const slug =
    typeof (body as { slug?: unknown } | null)?.slug === 'string'
      ? ((body as { slug: string }).slug ?? '')
      : '';
  if (!slug) {
    return NextResponse.json({ error: '缺少文章标识' }, { status: 400 });
  }
  const key = await clientKey();
  if (
    !(await consumeRateLimit('article-view', key, VIEW_LIMIT, VIEW_WINDOW_MS))
  ) {
    return NextResponse.json({ error: '请求太频繁' }, { status: 429 });
  }
  const interactionId = await articleInteractionId('view', slug, key);
  const stats = await recordArticleView(slug, interactionId);
  if (!stats) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  return NextResponse.json({ stats });
}

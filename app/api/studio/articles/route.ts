import { NextResponse } from 'next/server';
import { randomToken } from '@/lib/security';
import { requireApiSession } from '@/lib/server-auth';
import { articleInputSchema } from '@/lib/content-schemas';
import {
  articleSlugExists,
  createArticle,
  listAllArticles,
} from '@/lib/site-content';
import { countWords } from '@/lib/word-count';

// 站主文章管理：GET 全量列表（含草稿）/ POST 新建
const minutesFor = (content: string) =>
  Math.max(1, Math.round(countWords(content) / 400));

export async function GET(request: Request) {
  if (!(await requireApiSession(request))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  return NextResponse.json(
    { articles: await listAllArticles() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!(await requireApiSession(request, true))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = articleInputSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: '文章字段无效' }, { status: 400 });
  }
  const input = parsed.data;
  if (await articleSlugExists(input.slug)) {
    return NextResponse.json({ error: 'slug 已被占用' }, { status: 409 });
  }
  const id = randomToken();
  await createArticle({
    id,
    slug: input.slug,
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    publishedAt: input.publishedAt,
    updatedAt: input.updatedAt,
    readingMinutes: minutesFor(input.content),
    featured: input.featured,
    status: input.status,
    content: input.content,
  });
  return NextResponse.json({ ok: true, id });
}

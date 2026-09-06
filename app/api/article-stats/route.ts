import { NextResponse } from 'next/server';
import { getArticleStatsMap } from '@/lib/article-stats';
import { listPublishedArticleMetas } from '@/lib/site-content';

export async function GET(request: Request) {
  const requested = (new URL(request.url).searchParams.get('slugs') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
  const metas = await listPublishedArticleMetas();
  const known = new Set(metas.map((article) => article.slug));
  const slugs = [...new Set(requested.filter((slug) => known.has(slug)))];
  const stats = await getArticleStatsMap(slugs);
  return NextResponse.json({ stats });
}

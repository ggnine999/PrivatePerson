import { NextResponse } from 'next/server';
import { articles } from '@/lib/content';
import { getArticleStatsMap } from '@/lib/article-stats';

export async function GET(request: Request) {
  const requested = (new URL(request.url).searchParams.get('slugs') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
  const known = new Set(articles.map((article) => article.slug));
  const slugs = [...new Set(requested.filter((slug) => known.has(slug)))];
  const stats = await getArticleStatsMap(slugs);
  return NextResponse.json({ stats });
}

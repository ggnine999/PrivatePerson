import { NextResponse } from 'next/server';
import { listPublishedArticleMetas } from '@/lib/site-content';
import { listRecentArticleComments } from '@/lib/community-store';

// 最新评论：全站已发布的文章评论（含文章标题，按时间倒序）。
export async function GET() {
  const rows = await listRecentArticleComments(8);
  const titleBySlug = new Map(
    (await listPublishedArticleMetas()).map((a) => [a.slug, a.title]),
  );
  const comments = rows.map((row) => ({
    ...row,
    articleTitle: titleBySlug.get(row.articleSlug) ?? '已下架的文章',
  }));
  return NextResponse.json(
    { comments },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

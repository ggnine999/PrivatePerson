import { NextResponse } from 'next/server';
import {
  listPublishedArticleMetas,
  listPublishedProjects,
} from '@/lib/site-content';

// 全站搜索的轻量公开索引（不含正文），供 site-search 客户端过滤。
export async function GET() {
  const [articles, projects] = await Promise.all([
    listPublishedArticleMetas(),
    listPublishedProjects(),
  ]);
  return NextResponse.json(
    {
      articles: articles.map((article) => ({
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category,
        tags: article.tags,
        readingMinutes: article.readingMinutes,
      })),
      projects: projects.map((project) => ({
        slug: project.slug,
        name: project.name,
        description: project.description,
        tech: project.tech,
        website: project.website,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

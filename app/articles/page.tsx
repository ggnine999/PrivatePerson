import type { Metadata } from 'next';
import { ArticleBrowser } from '@/components/article-browser';
import { listPublishedArticles } from '@/lib/site-content';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '全部文章',
  description: '星屿手记的全部文章、分类与标签。',
};
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; category?: string }>;
}) {
  const query = await searchParams;
  const articles = await listPublishedArticles();
  return (
    <main className="page shell">
      <header className="page-head">
        <span className="kicker">LIBRARY</span>
        <h1>所有文章</h1>
        <p>在工程、安全、设计与日常之间，收集那些值得再次翻开的想法。</p>
      </header>
      <ArticleBrowser
        articles={articles}
        initialQuery={query.tag ?? query.q}
        initialCategory={query.category}
      />
    </main>
  );
}

import type { Metadata } from 'next';
import { StudioArticleManager } from '@/components/studio-article-manager';
export const metadata: Metadata = { title: '文章管理', robots: { index: false } };
export default function StudioArticlesPage() {
  return (
    <main className="page shell narrow">
      <header className="page-head">
        <span className="kicker">STUDIO</span>
        <h1>文章管理</h1>
        <p>站主专用：新建、编辑、发布草稿与删除文章。此页面不会出现在访客导航里。</p>
      </header>
      <StudioArticleManager />
    </main>
  );
}

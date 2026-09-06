import type { Metadata } from 'next';
import { StudioProjectManager } from '@/components/studio-project-manager';
export const metadata: Metadata = { title: '项目管理', robots: { index: false } };
export default function StudioProjectsPage() {
  return (
    <main className="page shell narrow">
      <header className="page-head">
        <span className="kicker">STUDIO</span>
        <h1>项目管理</h1>
        <p>站主专用：维护项目档案、链接与展示状态。此页面不会出现在访客导航里。</p>
      </header>
      <StudioProjectManager />
    </main>
  );
}

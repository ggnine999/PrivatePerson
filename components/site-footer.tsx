import Link from 'next/link';
import { listPublishedArticleMetas, listPublishedProjects } from '@/lib/site-content';
import { Hitokoto } from '@/components/hitokoto';

// 建站日期取仓库首个提交日，用于页脚「已运行 N 天」。
const LAUNCH_DATE = '2026-09-04';

function runningDays() {
  const elapsed = Date.now() - new Date(`${LAUNCH_DATE}T00:00:00+08:00`).getTime();
  return Math.max(1, Math.floor(elapsed / 86_400_000) + 1);
}

export async function SiteFooter() {
  const [articles, projects] = await Promise.all([
    listPublishedArticleMetas(200),
    listPublishedProjects(),
  ]);
  return <footer className="site-footer"><div className="shell footer-grid"><div><strong>星屿手记</strong><p>愿每一次认真记录，都成为照亮来路的小小星光。</p><p className="footer-stats">已运行 {runningDays()} 天 · {articles.length} 篇文章 · {projects.length} 个项目 · 持续更新中</p></div><nav aria-label="页脚导航"><Link href="/articles">文章</Link><Link href="/projects">项目</Link><Link href="/about">关于</Link><Link href="/rss.xml">RSS</Link></nav></div><Hitokoto /><div className="shell copyright">© 2026 星屿手记 · 示例内容可自由替换</div></footer>;
}

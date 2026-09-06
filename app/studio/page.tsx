import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  FolderKanban,
  LockKeyhole,
  MessageCircleHeart,
  ShieldCheck,
} from 'lucide-react';
import { StudioModeration } from '@/components/studio-moderation';
export const metadata: Metadata = { title: '创作工坊', robots: { index: false } };
export default function StudioPage(){
  return <main className="page shell narrow">
    <header className="page-head"><span className="kicker">STUDIO</span><h1>创作工坊</h1><p>站主专用：管理文章、项目与说说，审核游客的评论、留言和友链申请。此页面不会出现在访客导航里。</p></header>
    <div className="studio-links">
      <Link href="/studio/articles" className="studio-link-card"><FileText aria-hidden="true" /><strong>文章管理</strong><span>新建、编辑、发布草稿与删除文章</span></Link>
      <Link href="/studio/projects" className="studio-link-card"><FolderKanban aria-hidden="true" /><strong>项目管理</strong><span>维护项目档案、链接与展示状态</span></Link>
      <Link href="/moments" className="studio-link-card"><MessageCircleHeart aria-hidden="true" /><strong>说说管理</strong><span>在说说页直接发布、编辑与删除</span></Link>
      <Link href="/vault" className="studio-link-card"><LockKeyhole aria-hidden="true" /><strong>私人保险库</strong><span>解锁加密的私人密码与密钥记录</span></Link>
      <div className="studio-link-card is-static"><ShieldCheck aria-hidden="true" /><strong>内容审核</strong><span>本页下方继续处理游客提交</span></div>
    </div>
    <section className="studio-moderation-section">
      <span className="kicker">MODERATION</span>
      <h2>内容审核</h2>
    </section>
    <StudioModeration/>
  </main>;
}

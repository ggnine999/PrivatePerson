import type { Metadata } from 'next';
import { StudioModeration } from '@/components/studio-moderation';
export const metadata: Metadata = { title: '内容审核', robots: { index: false } };
export default function StudioPage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">STUDIO</span><h1>内容审核</h1><p>站主专用：审核游客的评论、留言和友链申请。此页面不会出现在访客导航里。</p></header><StudioModeration/></main>}

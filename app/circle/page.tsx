import type { Metadata } from 'next';
import { FriendCircleBoard } from '@/components/friend-circle-board';
export const metadata: Metadata = { title: '友链朋友圈', description: '订阅的博客伙伴们最近在写什么。' };
export default function CirclePage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">FRIEND CIRCLE</span><h1>友链朋友圈</h1><p>聚合友链 RSS 的最新文章——不必挨个串门，也能知道大家最近在写什么。动态由定时任务与站主手动刷新。</p></header><FriendCircleBoard/></main>}

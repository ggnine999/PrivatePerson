import type { Metadata } from 'next';
import { MomentsBoard } from '@/components/moments-board';
export const metadata: Metadata = { title: '说说', description: '站主的时间线：随手记下的此刻想法。' };
export default function MomentsPage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">MOMENTS</span><h1>说说</h1><p>随手记下的想法与日常——不成文章的小句子都住在这里。</p></header><MomentsBoard/></main>}

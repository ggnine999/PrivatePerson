import type { Metadata } from 'next';
import { MessageBoard } from '@/components/message-board';
import { CommunityPulse } from '@/components/community-pulse';
export const metadata: Metadata = { title: '留言板', description: '和博主聊聊天，说说想法。' };
export default function MessagesPage(){return <main className="page shell"><header className="page-head"><span className="kicker">TALK WITH ME</span><h1>留言板</h1><p>随便聊点什么——咨询、反馈、打招呼都可以。游客留言需要审核，注册成员的留言会直接显示。</p></header><MessageBoard/><CommunityPulse/></main>}

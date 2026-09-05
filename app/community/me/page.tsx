import type { Metadata } from 'next';
import { CommunityProfile } from '@/components/community-profile';
export const metadata: Metadata = { title: '我的社区资料', robots: { index: false } };
export default function CommunityMePage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">COMMUNITY</span><h1>我的资料</h1><p>社区账号与私人保险库完全独立，这里只管理评论区身份。</p></header><CommunityProfile/></main>}

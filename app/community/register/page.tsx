import type { Metadata } from 'next';
import { CommunityAuthForm } from '@/components/community-auth-form';
export const metadata: Metadata = { title: '注册社区账号', robots: { index: false } };
export default function CommunityRegisterPage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">COMMUNITY</span><h1>注册社区账号</h1><p>只需要用户名和密码。注册后可以免审核评论、维护头像和资料。</p></header><CommunityAuthForm mode="register"/></main>}

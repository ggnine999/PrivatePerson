import type { Metadata } from 'next';
import { CommunityAuthForm } from '@/components/community-auth-form';
export const metadata: Metadata = { title: '社区登录', robots: { index: false } };
export default function CommunityLoginPage(){return <main className="page shell narrow"><header className="page-head"><span className="kicker">COMMUNITY</span><h1>社区登录</h1><p>登录后评论不用审核、可以用头像和昵称。社区账号与私人保险库完全独立。</p></header><CommunityAuthForm mode="login"/></main>}

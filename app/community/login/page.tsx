import type { Metadata } from 'next';
import { CommunityAuthForm } from '@/components/community-auth-form';
export const metadata: Metadata = { title: '社区登录', robots: { index: false } };
export default function CommunityLoginPage(){return <main className="auth-page"><CommunityAuthForm mode="login"/></main>}

import type { Metadata } from 'next';
import { CommunityAuthForm } from '@/components/community-auth-form';
export const metadata: Metadata = { title: '注册社区账号', robots: { index: false } };
export default function CommunityRegisterPage(){return <main className="auth-page"><CommunityAuthForm mode="register"/></main>}

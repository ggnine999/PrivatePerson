import type { Metadata } from 'next';
import { CommunityProfile } from '@/components/community-profile';
export const metadata: Metadata = { title: '我的社区资料', robots: { index: false } };
export default function CommunityMePage(){return <main className="page shell"><CommunityProfile/></main>}

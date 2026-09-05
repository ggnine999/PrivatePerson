import type { Metadata } from 'next';
import { FriendLinks } from '@/components/friend-links';
export const metadata: Metadata = { title: '友情链接', description: '博客伙伴们的站点，以及友链申请方式。' };
export default function LinksPage(){return <main className="page shell"><header className="page-head"><span className="kicker">BLOG ROLL</span><h1>友情链接</h1><p>一路同行博客伙伴们的站点。想交换友链的话，提交你的站点信息，博主审核通过后就会出现在这里。</p></header><FriendLinks/></main>}

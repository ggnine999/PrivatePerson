import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedArticles } from '@/lib/site-content';
export const dynamic = 'force-dynamic';
export const metadata:Metadata={title:'文章归档'};
export default async function ArchivePage(){const articles=await listPublishedArticles();const groups=Object.groupBy(articles,item=>item.publishedAt.slice(0,7));return <main className="page narrow shell"><header className="page-head"><span className="kicker">TIMELINE</span><h1>文章归档</h1><p>按年月回看写下的痕迹。</p></header><div className="timeline">{Object.entries(groups).map(([month,items])=><section key={month}><h2>{month.replace('-',' / ')}</h2>{items?.map(item=><Link href={`/articles/${item.slug}`} key={item.slug}><time>{item.publishedAt.slice(8)}</time><span>{item.title}</span><small>{item.category}</small></Link>)}</section>)}</div></main>}

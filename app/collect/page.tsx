import type { Metadata } from 'next';
import { collectLinks } from '@/lib/content';
export const metadata: Metadata = { title: '收藏', description: '阿枫常逛的站点与工具收藏。' };
const GROUPS = ['开发常备', '二次元补给', '灵感补给'];
export default function CollectPage(){return <main className="page shell"><header className="page-head"><span className="kicker">BOOKMARKS</span><h1>收藏</h1><p>常逛的站点与离不开的工具，按用途分组。收藏夹整理术的唯一秘诀：定期删。</p></header>{GROUPS.map(group=>{const items=collectLinks.filter(item=>item.group===group);return <section className="collect-group" key={group} aria-label={group}><h2>{group}<small>{items.length} 个</small></h2><div className="collect-grid">{items.map(item=><a className="collect-card" href={item.url} target="_blank" rel="noopener noreferrer" key={item.url}><strong>{item.name}</strong><span>{item.description}</span></a>)}</div></section>})}</main>}

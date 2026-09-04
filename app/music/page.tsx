import type { Metadata } from 'next';
import type { NeteaseEmbed } from '@/lib/music';
import { neteaseEmbeds } from '@/lib/music';
export const metadata:Metadata={title:'音乐',description:'我在听的音乐，来自网易云音乐官方外链播放器。'};

// 网易云官方生成的 iframe 高度比 URL 里的 height 参数多 20px（品牌栏）
const IFRAME_HEIGHT:Record<NeteaseEmbed['type'],number>={song:86,playlist:110};

export default function MusicPage(){return <main className="page shell"><header className="page-head"><span className="kicker">ON REPEAT</span><h1>音乐</h1><p>通过网易云音乐官方外链播放器分享我在听的歌曲。个别歌曲若因版权限制无法外链，播放器会显示平台的提示；VIP 歌曲对未登录访客可能只有试听片段。</p></header><div className="netease-list">{neteaseEmbeds.map((embed)=>{const playerType=embed.type==='song'?2:0;const urlHeight=embed.type==='song'?66:90;return <article key={`${embed.type}-${embed.id}`} className="netease-card"><div className="netease-head"><h2>{embed.title}</h2><p>{embed.note}</p></div><iframe src={`https://music.163.com/outchain/player?type=${playerType}&id=${embed.id}&auto=0&height=${urlHeight}`} width="100%" height={IFRAME_HEIGHT[embed.type]} loading="lazy" title={`网易云音乐外链播放器：${embed.title}`}></iframe></article>})}</div></main>}

import type { Metadata } from 'next';
import { RhythmGame } from '@/components/rhythm-game';

export const metadata: Metadata = {
  title: '游戏',
  description: '星屿的像素游戏厅：浏览器里点开就玩的原创小游戏，先来一把音游「星屿音击」。',
};

export default function GamesPage() {
  return (
    <main className="page shell">
      <header className="page-head">
        <span className="kicker">GAMES</span>
        <h1>游戏</h1>
        <p>不用下载、不用注册，点开就玩。全部原创，成绩可以上榜。</p>
      </header>
      <RhythmGame />
    </main>
  );
}

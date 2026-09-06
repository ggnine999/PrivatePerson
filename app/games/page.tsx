import type { Metadata } from 'next';
import { GameShelf } from '@/components/game-shelf';
import { RhythmGame } from '@/components/rhythm-game';

export const metadata: Metadata = {
  title: '游戏',
  description: '星屿的像素游戏厅：浏览器里点开就玩的原创小游戏，先来一把音游「星屿音击」。',
};

export default function GamesPage() {
  return (
    <main className="page shell">
      <section id="starbeat" className="game-anchor">
        <RhythmGame />
      </section>
      <GameShelf />
    </main>
  );
}

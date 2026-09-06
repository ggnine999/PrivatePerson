import type { CSSProperties } from 'react';
import { GAME_CATALOG } from '@/lib/games';

// 游戏架：从 lib/games.ts 的目录自动渲染所有游戏卡片。
// playable 的卡片是锚点链接，跳到页面上对应的游戏区块；
// soon 的卡片是占位，做成后把 status 改成 playable 即可。
export function GameShelf() {
  return (
    <section className="game-shelf" aria-label="游戏架">
      <div className="game-grid">
        {GAME_CATALOG.map((game) => {
          const style = { '--accent': game.accent } as CSSProperties;
          const inner = (
            <>
              <span className="game-card-icon" aria-hidden="true">
                {game.icon}
              </span>
              <span className="game-card-title">{game.title}</span>
              <span className="game-card-tagline">{game.tagline}</span>
              <span className="game-card-status" data-status={game.status}>
                {game.status === 'playable' ? '可玩' : '敬请期待'}
              </span>
            </>
          );
          return game.status === 'playable' ? (
            <a key={game.id} href={`#${game.id}`} className="game-card" style={style}>
              {inner}
            </a>
          ) : (
            <div key={game.id} className="game-card is-soon" style={style}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="game-shelf-hint">做完一款上架一款——新游戏会自动出现在这个架子上。</p>
    </section>
  );
}

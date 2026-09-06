import type { Metadata } from 'next';
import { animeList } from '@/lib/content';
export const metadata: Metadata = { title: '追番', description: '阿枫的追番记录：在看、看完与计划中的动画。' };
const GROUPS = ['在看', '看完', '想看'] as const;
export default function AnimePage() {
  return (
    <main className="page shell">
      <header className="page-head">
        <span className="kicker">BANGUMI LIST</span>
        <h1>追番</h1>
        <p>个人向的追番记录：五星只给真正打动我的作品。想看清单在慢慢补，封面等接入 Bangumi 同步后再补上。</p>
      </header>
      {GROUPS.map((group) => {
        const items = animeList.filter((item) => item.status === group);
        if (items.length === 0) return null;
        return (
          <section className="anime-group" key={group} aria-label={`${group}的动画`}>
            <h2>
              {group}
              <small>{items.length} 部</small>
            </h2>
            <div className="anime-grid">
              {items.map((item) => (
                <article className="anime-card" key={item.title}>
                  <span className="anime-mark" aria-hidden="true">
                    {item.title.slice(0, 1)}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p className="anime-meta">
                      {item.year} · {item.progress}
                      {item.stars > 0 && (
                        <span className="anime-stars" aria-label={`${item.stars} 星`}>
                          {'★'.repeat(item.stars)}
                          {'☆'.repeat(5 - item.stars)}
                        </span>
                      )}
                    </p>
                    <p className="anime-comment">{item.comment}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

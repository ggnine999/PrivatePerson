import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@/lib/site-content';

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

export type ArticleStats = { views: number; likes: number };
export type LikeResult = { stats: ArticleStats; liked: boolean };

async function isKnownSlug(slug: string) {
  try {
    return Boolean(await getArticleBySlug(slug));
  } catch {
    return false;
  }
}

export async function getArticleStatsMap(slugs: string[]) {
  const stats: Record<string, ArticleStats> = {};
  for (const slug of slugs) stats[slug] = { views: 0, likes: 0 };
  if (slugs.length === 0) return stats;
  try {
    const placeholders = slugs.map(() => '?').join(',');
    const result = await db()
      .prepare(
        `SELECT slug, views, likes FROM article_stats WHERE slug IN (${placeholders})`,
      )
      .bind(...slugs)
      .all<{ slug: string; views: number; likes: number }>();
    for (const row of result.results) {
      stats[row.slug] = { views: row.views, likes: row.likes };
    }
  } catch {
    // 计数表暂不可用时按 0 返回，不影响页面渲染
  }
  return stats;
}

export async function recordArticleView(
  slug: string,
  interactionId: string,
): Promise<ArticleStats | null> {
  if (!(await isKnownSlug(slug))) return null;
  try {
    const database = db();
    const inserted = await database
      .prepare(
        `INSERT OR IGNORE INTO article_view_events (id, slug, created_at)
         VALUES (?, ?, ?)`,
      )
      .bind(interactionId, slug, Date.now())
      .run();
    if ((inserted.meta?.changes ?? 0) === 0) {
      return await getArticleStats(slug);
    }
    return await database
      .prepare(
        `INSERT INTO article_stats (slug, views, likes, updated_at)
         VALUES (?, 1, 0, ?)
         ON CONFLICT(slug) DO UPDATE SET
           views = views + 1,
           updated_at = excluded.updated_at
         RETURNING views, likes`,
      )
      .bind(slug, Date.now())
      .first<ArticleStats>();
  } catch {
    return null;
  }
}

async function getArticleStats(slug: string): Promise<ArticleStats> {
  const row = await db()
    .prepare('SELECT views, likes FROM article_stats WHERE slug = ?')
    .bind(slug)
    .first<ArticleStats>();
  return row ?? { views: 0, likes: 0 };
}

export async function setArticleLike(
  slug: string,
  interactionId: string,
  liked: boolean,
): Promise<LikeResult | null> {
  if (!(await isKnownSlug(slug))) return null;
  try {
    const database = db();
    const change = liked
      ? await database
          .prepare(
            `INSERT OR IGNORE INTO article_like_events (id, slug, created_at)
             VALUES (?, ?, ?)`,
          )
          .bind(interactionId, slug, Date.now())
          .run()
      : await database
          .prepare('DELETE FROM article_like_events WHERE id = ? AND slug = ?')
          .bind(interactionId, slug)
          .run();

    if ((change.meta?.changes ?? 0) === 0) {
      return { stats: await getArticleStats(slug), liked };
    }

    const delta = liked ? 1 : -1;
    const stats = await database
      .prepare(
        `INSERT INTO article_stats (slug, views, likes, updated_at)
         VALUES (?, 0, MAX(0, ?), ?)
         ON CONFLICT(slug) DO UPDATE SET
           likes = MAX(0, likes + ?),
           updated_at = excluded.updated_at
         RETURNING views, likes`,
      )
      .bind(slug, delta, Date.now(), delta)
      .first<ArticleStats>();
    return stats ? { stats, liked } : null;
  } catch {
    return null;
  }
}

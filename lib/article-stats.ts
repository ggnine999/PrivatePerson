import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@/lib/site-content';

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

export type ArticleStats = { views: number; likes: number };

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
): Promise<ArticleStats | null> {
  if (!(await isKnownSlug(slug))) return null;
  try {
    return await db()
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

export async function adjustArticleLikes(
  slug: string,
  delta: number,
): Promise<ArticleStats | null> {
  if (!(await isKnownSlug(slug))) return null;
  try {
    return await db()
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
  } catch {
    return null;
  }
}

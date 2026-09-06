'use client';

import { useEffect, useReducer, useState } from 'react';
import { Eye, ThumbsUp } from 'lucide-react';

export type ArticleStats = { views: number; likes: number };

// 模块级共享缓存：同屏多个徽章合并为一次批量请求。
const cache = new Map<string, ArticleStats>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function applyStats(slug: string, stats: ArticleStats) {
  cache.set(slug, stats);
  notify();
}

function ensureLoaded(slugs: string[]) {
  const missing = slugs.filter((slug) => !cache.has(slug) && !pending.has(slug));
  if (missing.length === 0) return;
  for (const slug of missing) pending.add(slug);
  const query = missing
    .map((slug) => `slugs=${encodeURIComponent(slug)}`)
    .join('&');
  fetch(`/api/article-stats?${query}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('stats unavailable');
      return (await response.json()) as { stats: Record<string, ArticleStats> };
    })
    .then((data) => {
      for (const slug of missing) {
        cache.set(slug, data.stats[slug] ?? { views: 0, likes: 0 });
      }
      notify();
    })
    .catch(() => {
      for (const slug of missing) cache.set(slug, { views: 0, likes: 0 });
      notify();
    })
    .finally(() => {
      for (const slug of missing) pending.delete(slug);
    });
}

function useArticleStats(slug: string): ArticleStats | null {
  const [, force] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const listener = () => force();
    listeners.add(listener);
    ensureLoaded([slug]);
    return () => {
      listeners.delete(listener);
    };
  }, [slug]);
  return cache.get(slug) ?? null;
}

/** 列表卡片里的轻量阅读量徽章（数据加载后原位补齐）。 */
export function ViewsBadge({ slug }: { slug: string }) {
  const stats = useArticleStats(slug);
  if (!stats) return null;
  return (
    <span className="views-badge">
      <Eye aria-hidden="true" /> {stats.views} 次阅读
    </span>
  );
}

function useViewPing(slug: string) {
  useEffect(() => {
    const key = `starry:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // 隐私模式等无法使用存储时放弃去重，直接尝试计数
    }
    fetch('/api/article-stats/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('view failed');
        return (await response.json()) as { stats: ArticleStats };
      })
      .then((data) => applyStats(slug, data.stats))
      .catch(() => {});
  }, [slug]);
}

/** 文章页统计条：进入页面记一次阅读（每会话去重），并提供点赞按钮。 */
export function ArticleStatsBar({ slug }: { slug: string }) {
  const stats = useArticleStats(slug);
  const [liked, setLiked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useViewPing(slug);
  useEffect(() => {
    // 延迟到下一个宏任务读取本地点赞标记，避免水合期不匹配
    const timer = setTimeout(() => {
      try {
        setLiked(localStorage.getItem(`starry:liked:${slug}`) === '1');
      } catch {
        // 存储不可用时按未点赞处理
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [slug]);
  async function toggleLike() {
    if (submitting) return;
    const next = !liked;
    setLiked(next);
    setSubmitting(true);
    try {
      const response = await fetch('/api/article-stats/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, delta: next ? 1 : -1 }),
      });
      if (response.ok) {
        const data = (await response.json()) as { stats: ArticleStats };
        applyStats(slug, data.stats);
        try {
          localStorage.setItem(`starry:liked:${slug}`, next ? '1' : '0');
        } catch {
          // 存储不可用时仅本次会话生效
        }
      } else {
        setLiked(!next);
      }
    } catch {
      setLiked(!next);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="article-stats">
      <span className="article-views">
        <Eye aria-hidden="true" /> {stats ? `${stats.views} 次阅读` : '…'}
      </span>
      <button
        type="button"
        className={`like-button${liked ? ' liked' : ''}`}
        onClick={() => void toggleLike()}
        disabled={submitting}
      >
        <ThumbsUp aria-hidden="true" /> {stats ? stats.likes : 0} 个赞
      </button>
    </div>
  );
}

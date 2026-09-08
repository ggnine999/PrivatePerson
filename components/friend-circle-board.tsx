'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type CirclePost = {
  id: string;
  friendName: string;
  title: string;
  link: string;
  publishedAt: number;
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function safePostHref(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

// 友链朋友圈：聚合友链 RSS 的最新文章；站主可手动刷新。
export function FriendCircleBoard() {
  const [posts, setPosts] = useState<CirclePost[] | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [summary, setSummary] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/friend-circle');
    if (response.ok) {
      const data = (await response.json()) as {
        posts: CirclePost[];
        canRefresh: boolean;
        csrfToken: string | null;
      };
      setPosts(data.posts);
      setCanRefresh(data.canRefresh);
      setCsrfToken(data.csrfToken ?? '');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setSummary('');
    try {
      const response = await fetch('/api/friend-circle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });
      const data = (await response.json()) as {
        error?: string;
        summary?: {
          results: Array<{ name: string; ok: boolean }>;
          inserted: number;
        };
        posts?: CirclePost[];
      };
      if (!response.ok) {
        setSummary(data.error ?? '刷新失败，请稍后再试');
        return;
      }
      if (data.posts) setPosts(data.posts);
      const okCount = data.summary?.results.filter((r) => r.ok).length ?? 0;
      const total = data.summary?.results.length ?? 0;
      setSummary(
        `已刷新 ${total} 个源（成功 ${okCount}），新增 ${data.summary?.inserted ?? 0} 篇`,
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="friend-circle">
      {canRefresh && (
        <div className="circle-toolbar">
          <button
            type="button"
            className="button ghost"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw
              aria-hidden="true"
              className={refreshing ? 'spinning' : ''}
            />
            {refreshing ? '抓取中…' : '刷新友链动态'}
          </button>
          {summary && <p className="circle-summary">{summary}</p>}
        </div>
      )}
      {posts === null ? (
        <p className="comments-loading">动态加载中…</p>
      ) : posts.length === 0 ? (
        <p className="comments-empty">
          还没有抓到友链动态。站主可以点上面的「刷新友链动态」抓一次；
          抓取需要友链配置了 RSS 地址。
        </p>
      ) : (
        <ul className="circle-list">
          {posts.map((post) => {
            const href = safePostHref(post.link);
            if (!href) return null;
            return (
              <li key={post.id}>
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <span className="circle-post-head">
                    <span className="circle-friend">{post.friendName}</span>
                    <time dateTime={new Date(post.publishedAt).toISOString()}>
                      {formatDate(post.publishedAt)}
                    </time>
                  </span>
                  <strong>{post.title}</strong>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

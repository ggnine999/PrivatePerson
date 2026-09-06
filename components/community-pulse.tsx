'use client';

import Link from 'next/link';
import { MessageSquare, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type PulseComment = {
  id: string;
  articleSlug: string;
  authorName: string;
  authorType: 'member' | 'guest';
  content: string;
  createdAt: number;
  articleTitle: string;
};

type Reader = {
  username: string;
  displayName: string;
  avatar: string | null;
  publishedComments: number;
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 社区氛围区：全站最新评论 + 读者墙（按发布评论数排序的成员头像）。
export function CommunityPulse() {
  const [comments, setComments] = useState<PulseComment[] | null>(null);
  const [readers, setReaders] = useState<Reader[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [commentResponse, readerResponse] = await Promise.all([
        fetch('/api/community/recent-comments'),
        fetch('/api/community/readers'),
      ]);
      if (commentResponse.ok) {
        const data = (await commentResponse.json()) as { comments: PulseComment[] };
        setComments(data.comments);
      }
      if (readerResponse.ok) {
        const data = (await readerResponse.json()) as { readers: Reader[] };
        setReaders(data.readers);
      }
    } catch {
      setComments([]);
      setReaders([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="community-pulse">
      <section className="pulse-block" aria-label="最新评论">
        <h2>
          <MessageSquare aria-hidden="true" /> 最新评论
        </h2>
        {comments === null ? (
          <p className="comments-loading">加载中…</p>
        ) : comments.length === 0 ? (
          <p className="comments-empty">还没有评论——去文章里说第一句吧。</p>
        ) : (
          <ul className="pulse-comments">
            {comments.map((comment) => (
              <li key={comment.id}>
                <Link href={`/articles/${comment.articleSlug}`}>
                  <span className="pulse-comment-head">
                    <strong>{comment.authorName}</strong>
                    {comment.authorType === 'guest' && (
                      <span className="comments-badge">游客</span>
                    )}
                    <time dateTime={new Date(comment.createdAt).toISOString()}>
                      {formatDate(comment.createdAt)}
                    </time>
                  </span>
                  <span className="pulse-comment-body">{comment.content}</span>
                  <span className="pulse-comment-article">
                    《{comment.articleTitle}》
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="pulse-block" aria-label="读者墙">
        <h2>
          <Users aria-hidden="true" /> 读者墙
        </h2>
        {readers === null ? (
          <p className="comments-loading">加载中…</p>
        ) : readers.length === 0 ? (
          <p className="comments-empty">登录社区账号并发表评论，就能上墙啦。</p>
        ) : (
          <ul className="readers-wall">
            {readers.map((reader) => (
              <li key={reader.username} title={`@${reader.username} · ${reader.publishedComments} 条评论`}>
                {reader.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="reader-avatar" src={reader.avatar} alt="" />
                ) : (
                  <span className="reader-avatar reader-avatar-fallback" aria-hidden="true">
                    {reader.displayName.slice(0, 1)}
                  </span>
                )}
                <span className="reader-name">{reader.displayName}</span>
                <span className="reader-count">{reader.publishedComments}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

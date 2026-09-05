'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type CommentItem = {
  id: string;
  parentId: string | null;
  authorType: 'member' | 'guest';
  authorName: string;
  content: string;
  createdAt: number;
};

type Member = { displayName: string; level: number } | null;

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [member, setMember] = useState<Member>(null);
  const [guestName, setGuestName] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/community/comments?slug=${encodeURIComponent(slug)}`,
    );
    if (response.ok) {
      const data = (await response.json()) as { comments: CommentItem[] };
      setComments(data.comments);
    }
  }, [slug]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      void (async () => {
        try {
          const response = await fetch('/api/community/me');
          if (response.ok) {
            const data = (await response.json()) as {
              user: { displayName: string; level: number } | null;
            };
            setMember(data.user);
          }
        } catch {
          setMember(null);
        }
      })();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function submit() {
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          content,
          guestName: member ? undefined : guestName,
        }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? '提交失败，请稍后再试');
        return;
      }
      setNotice(data.message ?? '评论已提交');
      setContent('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="comments" aria-label="评论区">
      <h2>评论</h2>
      <div className="comments-form">
        {!member && (
          <input
            className="comments-name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="昵称（游客评论需审核后显示）"
            maxLength={20}
            aria-label="昵称"
          />
        )}
        {member && (
          <p className="comments-member">
            将以 <strong>{member.displayName}</strong>（Lv.{member.level}）发布
          </p>
        )}
        {!member && (
          <p className="comments-member">
            游客评论需审核后显示；
            <Link href="/community/login">登录社区账号</Link>
            可免审核并使用头像。
          </p>
        )}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="说点什么吧……（支持 2-1000 字）"
          maxLength={1000}
          rows={4}
          aria-label="评论内容"
        />
        <div className="comments-actions">
          {error && <p className="comments-error">{error}</p>}
          {notice && <p className="comments-notice">{notice}</p>}
          <button
            type="button"
            className="button primary"
            onClick={() => void submit()}
            disabled={submitting || content.trim().length < 2}
          >
            {submitting ? '提交中…' : '发表评论'}
          </button>
        </div>
      </div>
      {comments === null ? (
        <p className="comments-loading">评论加载中…</p>
      ) : comments.length === 0 ? (
        <p className="comments-empty">还没有评论，来抢沙发吧。</p>
      ) : (
        <ul className="comments-list">
          {comments.map((comment) => {
            const parent = comment.parentId
              ? comments.find((item) => item.id === comment.parentId)
              : null;
            return (
              <li key={comment.id} className="comments-item">
                <p className="comments-meta">
                  <strong>{comment.authorName}</strong>
                  <span className="comments-badge">
                    {comment.authorType === 'member' ? '成员' : '游客'}
                  </span>
                  <time dateTime={new Date(comment.createdAt).toISOString()}>
                    {formatTime(comment.createdAt)}
                  </time>
                </p>
                <p className="comments-content">
                  {parent && (
                    <span className="comments-reply">
                      回复 @{parent.authorName}：
                    </span>
                  )}
                  {comment.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

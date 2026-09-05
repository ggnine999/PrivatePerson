'use client';

import { useCallback, useEffect, useState } from 'react';

type PendingItem = { id: string; author: string; content: string; createdAt: number };

type Pending = {
  comments: (PendingItem & { slug: string })[];
  messages: PendingItem[];
  links: (PendingItem & { url: string })[];
};

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function StudioModeration() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/studio/pending');
    if (response.status === 401) {
      setUnauthorized(true);
      return;
    }
    if (response.ok) {
      setPending((await response.json()) as Pending);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function moderate(type: 'comment' | 'message' | 'link', id: string, action: 'approve' | 'delete') {
    setBusyId(id);
    try {
      const session = (await fetch('/api/auth/session').then((r) => r.json())) as {
        csrfToken?: string;
      };
      await fetch('/api/studio/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': session.csrfToken ?? '',
        },
        body: JSON.stringify({ type, id, action }),
      });
      await load();
    } finally {
      setBusyId('');
    }
  }

  if (unauthorized) {
    return (
      <p className="comments-hint">
        需要以站主身份登录后才能审核。请先通过保险库登录页完成站主登录。
      </p>
    );
  }
  if (pending === null) {
    return <p className="comments-loading">加载中…</p>;
  }

  const total = pending.comments.length + pending.messages.length + pending.links.length;

  return (
    <div className="studio-moderation">
      <p className="comments-hint">
        待审核共 {total} 项。成员发言直接发布，游客内容需要在这里审核。
      </p>
      {total === 0 && <p className="comments-empty">没有待审核的内容。</p>}
      {pending.comments.length > 0 && (
        <section>
          <h2>文章评论（{pending.comments.length}）</h2>
          <ul className="comments-list">
            {pending.comments.map((item) => (
              <li key={item.id} className="comments-item">
                <p className="comments-meta">
                  <strong>{item.author}</strong>
                  <time>{formatTime(item.createdAt)}</time>
                </p>
                <p className="comments-content">{item.content}</p>
                <p className="comments-meta">
                  <span className="comments-reply">文章：{item.slug}</span>
                </p>
                <div className="comments-actions">
                  <button type="button" className="button primary" disabled={busyId === item.id} onClick={() => void moderate('comment', item.id, 'approve')}>通过</button>
                  <button type="button" className="button ghost" disabled={busyId === item.id} onClick={() => void moderate('comment', item.id, 'delete')}>删除</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pending.messages.length > 0 && (
        <section>
          <h2>留言板（{pending.messages.length}）</h2>
          <ul className="comments-list">
            {pending.messages.map((item) => (
              <li key={item.id} className="comments-item">
                <p className="comments-meta">
                  <strong>{item.author}</strong>
                  <time>{formatTime(item.createdAt)}</time>
                </p>
                <p className="comments-content">{item.content}</p>
                <div className="comments-actions">
                  <button type="button" className="button primary" disabled={busyId === item.id} onClick={() => void moderate('message', item.id, 'approve')}>通过</button>
                  <button type="button" className="button ghost" disabled={busyId === item.id} onClick={() => void moderate('message', item.id, 'delete')}>删除</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pending.links.length > 0 && (
        <section>
          <h2>友链申请（{pending.links.length}）</h2>
          <ul className="comments-list">
            {pending.links.map((item) => (
              <li key={item.id} className="comments-item">
                <p className="comments-meta">
                  <strong>{item.author}</strong>
                  <time>{formatTime(item.createdAt)}</time>
                </p>
                <p className="comments-content">{item.content}</p>
                <div className="comments-actions">
                  <button type="button" className="button primary" disabled={busyId === item.id} onClick={() => void moderate('link', item.id, 'approve')}>通过</button>
                  <button type="button" className="button ghost" disabled={busyId === item.id} onClick={() => void moderate('link', item.id, 'delete')}>删除</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

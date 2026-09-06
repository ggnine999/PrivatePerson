'use client';

import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { EmojiPicker } from '@/components/emoji-picker';

type Moment = { id: string; content: string; createdAt: number };

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 说说时间线：所有访客可看；站主会话下出现发布框与删除按钮。
export function MomentsBoard() {
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/moments');
    if (response.ok) {
      const data = (await response.json()) as {
        moments: Moment[];
        canPublish: boolean;
        csrfToken: string | null;
      };
      setMoments(data.moments);
      setCanPublish(data.canPublish);
      setCsrfToken(data.csrfToken ?? '');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function publish() {
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/moments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? '发布失败，请稍后再试');
        return;
      }
      setContent('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch('/api/moments', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ id }),
    });
    if (response.ok) await load();
  }

  return (
    <div className="moments-board">
      {canPublish && (
        <form
          className="moments-form comments-form"
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="记点此刻的想法……（支持 2-1000 字）"
            maxLength={1000}
            rows={3}
            aria-label="说说内容"
          />
          <EmojiPicker onPick={(face) => setContent((prev) => prev + face)} />
          <div className="comments-actions">
            {error && <p className="comments-error">{error}</p>}
            <button
              type="submit"
              className="button primary"
              disabled={submitting || content.trim().length < 2}
            >
              {submitting ? '发布中…' : '发布说说'}
            </button>
          </div>
        </form>
      )}
      {moments === null ? (
        <p className="comments-loading">说说加载中…</p>
      ) : moments.length === 0 ? (
        <p className="comments-empty">还没有说说，第一句马上就来。</p>
      ) : (
        <ol className="moments-timeline">
          {moments.map((moment) => (
            <li key={moment.id}>
              <time dateTime={new Date(moment.createdAt).toISOString()}>
                {formatTime(moment.createdAt)}
              </time>
              <p>{moment.content}</p>
              {canPublish && (
                <button
                  type="button"
                  className="moment-delete"
                  aria-label="删除这条说说"
                  onClick={() => void remove(moment.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

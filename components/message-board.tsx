'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EmojiPicker } from '@/components/emoji-picker';

type Message = {
  id: string;
  authorType: 'member' | 'guest';
  authorName: string;
  content: string;
  createdAt: number;
};

type Member = { displayName: string } | null;

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function MessageBoard() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [member, setMember] = useState<Member>(null);
  const [guestName, setGuestName] = useState('');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertFace(face: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + face);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? start;
    setContent(content.slice(0, start) + face + content.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + face.length;
    });
  }

  const load = useCallback(async () => {
    const response = await fetch('/api/community/messages');
    if (response.ok) {
      const data = (await response.json()) as { messages: Message[] };
      setMessages(data.messages);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      void (async () => {
        try {
          const response = await fetch('/api/community/me');
          if (response.ok) {
            const data = (await response.json()) as { user: Member };
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
      const response = await fetch('/api/community/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          guestName: member ? undefined : guestName,
        }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? '提交失败，请稍后再试');
        return;
      }
      setNotice(data.message ?? '留言已提交');
      setContent('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="message-board">
      <div className="message-form comments-form">
        {!member && (
          <input
            className="comments-name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="昵称（游客留言需审核后显示）"
            maxLength={20}
            aria-label="昵称"
          />
        )}
        {member && (
          <p className="comments-member">
            将以 <strong>{member.displayName}</strong> 发布
          </p>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="写点想对博主说的话……（支持 2-1000 字）"
          maxLength={1000}
          rows={4}
          aria-label="留言内容"
        />
        <EmojiPicker onPick={insertFace} />
        <div className="comments-actions">
          {error && <p className="comments-error">{error}</p>}
          {notice && <p className="comments-notice">{notice}</p>}
          <button
            type="button"
            className="button primary"
            onClick={() => void submit()}
            disabled={submitting || content.trim().length < 2}
          >
            {submitting ? '提交中…' : '发表留言'}
          </button>
        </div>
      </div>
      {messages === null ? (
        <p className="comments-loading">留言加载中…</p>
      ) : messages.length === 0 ? (
        <p className="comments-empty">还没有留言，来当第一个吧。</p>
      ) : (
        <ul className="comments-list">
          {messages.map((message) => (
            <li key={message.id} className="comments-item">
              <p className="comments-meta">
                <strong>{message.authorName}</strong>
                <span className="comments-badge">
                  {message.authorType === 'member' ? '成员' : '游客'}
                </span>
                <time dateTime={new Date(message.createdAt).toISOString()}>
                  {formatTime(message.createdAt)}
                </time>
              </p>
              <p className="comments-content">{message.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type FriendLink = {
  id: string;
  name: string;
  url: string;
  description: string;
};

export function FriendLinks() {
  const [links, setLinks] = useState<FriendLink[] | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/community/links');
    if (response.ok) {
      const data = (await response.json()) as { links: FriendLink[] };
      setLinks(data.links);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function submit() {
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, description }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? '提交失败，请稍后再试');
        return;
      }
      setNotice(data.message ?? '申请已提交');
      setName('');
      setUrl('');
      setDescription('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="friend-links">
      <ul className="friend-links-grid">
        {links === null ? (
          <li className="comments-loading">友链加载中…</li>
        ) : links.length === 0 ? (
          <li className="comments-empty">还没有友链，欢迎成为第一个伙伴。</li>
        ) : (
          links.map((link) => (
            <li key={link.id} className="friend-link-card">
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <strong>
                  {link.name} <ExternalLink aria-hidden="true" />
                </strong>
                <span>{link.description}</span>
              </a>
            </li>
          ))
        )}
      </ul>
      <form
        className="friend-links-form comments-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2>申请友链</h2>
        <div className="friend-links-fields">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="站点名称"
            maxLength={40}
            aria-label="站点名称"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="站点地址（https:// 开头）"
            maxLength={300}
            aria-label="站点地址"
          />
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="一句话介绍你的站点"
          maxLength={200}
          rows={2}
          aria-label="站点介绍"
        />
        <div className="comments-actions">
          {error && <p className="comments-error">{error}</p>}
          {notice && <p className="comments-notice">{notice}</p>}
          <button
            type="submit"
            className="button primary"
            disabled={submitting || name.trim().length < 1 || url.trim().length < 1}
          >
            {submitting ? '提交中…' : '提交申请'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Copy, Check, ExternalLink, Shuffle, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type FriendLink = {
  id: string;
  name: string;
  url: string;
  description: string;
};

const SITE_DESCRIPTION = '把代码、生活与微小的灵感写进夜色。';

const LINK_RULES = [
  '先把本站加进你的友链，并保证可见；',
  '站点能正常访问，内容以原创为主；',
  '长期更新，纯转载 / 采集站暂不收录；',
  '换域名、改名称请留言告诉阿枫，会及时更新；',
  '二次元小伙伴无视以上全部要求，直接提交就好 XD',
];

export function FriendLinks() {
  const [links, setLinks] = useState<FriendLink[] | null>(null);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
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
    const timer = setTimeout(() => {
      setOrigin(window.location.origin);
      void load();
    }, 0);
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

  function visitRandom() {
    if (!links || links.length === 0) return;
    const link = links[Math.floor(Math.random() * links.length)];
    window.open(link.url, '_blank', 'noopener,noreferrer');
  }

  async function copySiteInfo() {
    const info = [
      `名称：星屿手记`,
      `链接：${origin}`,
      `描述：${SITE_DESCRIPTION}`,
      `图标：${origin}/favicon.svg`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(info);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="friend-links">
      <div className="friend-links-toolbar">
        <p className="friend-links-count">
          已收录 {links === null ? '…' : links.length} 个伙伴站点
        </p>
        <div className="friend-links-actions">
          <Link className="button ghost" href="/circle">
            <Users aria-hidden="true" /> 朋友圈
          </Link>
          <button
            type="button"
            className="button ghost"
            onClick={visitRandom}
            disabled={!links || links.length === 0}
          >
            <Shuffle aria-hidden="true" /> 随机串门
          </button>
        </div>
      </div>
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
      <section className="friend-links-info" aria-label="本站信息与友链申请规则">
        <div className="friend-site-card">
          <h2>本站信息</h2>
          <dl className="friend-site-fields">
            <div>
              <dt>名称</dt>
              <dd>星屿手记</dd>
            </div>
            <div>
              <dt>链接</dt>
              <dd>{origin || '（当前站点地址）'}</dd>
            </div>
            <div>
              <dt>描述</dt>
              <dd>{SITE_DESCRIPTION}</dd>
            </div>
            <div>
              <dt>图标</dt>
              <dd>{origin ? `${origin}/favicon.svg` : '/favicon.svg'}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="button ghost"
            onClick={() => void copySiteInfo()}
            disabled={!origin}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? '已复制 ✓' : '复制本站信息'}
          </button>
        </div>
        <div className="friend-rules-card">
          <h2>收录规则</h2>
          <ol className="friend-rules">
            {LINK_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </div>
      </section>
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

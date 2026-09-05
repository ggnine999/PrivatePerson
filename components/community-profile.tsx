'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Me = {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  level: number;
  publishedComments: number;
};

export function CommunityProfile() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [csrf, setCsrftoken] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/community/me');
      if (response.status === 401) {
        setMe(null);
        setLoading(false);
        return;
      }
      const data = (await response.json()) as {
        user: Me;
        csrfToken: string;
      };
      setMe(data.user);
      setDisplayName(data.user.displayName);
      setBio(data.user.bio ?? '');
      setCsrftoken(data.csrfToken);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function saveAvatar(file: File) {
    setError('');
    if (file.size > 100 * 1024) {
      setError('头像图片需要 100KB 以内');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
    setSaving(true);
    try {
      const response = await fetch('/api/community/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-community-csrf': csrf,
        },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      setNotice('头像已更新');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const response = await fetch('/api/community/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-community-csrf': csrf,
        },
        body: JSON.stringify({ displayName, bio }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? '保存失败');
        return;
      }
      setNotice('资料已更新');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/community/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) {
    return <p className="comments-loading">加载中…</p>;
  }
  if (!me) {
    return (
      <div className="community-auth">
        <p className="comments-hint">还没有登录社区账号。</p>
        <p>
          <Link className="button primary" href="/community/login">
            去登录
          </Link>{' '}
          <Link className="button ghost" href="/community/register">
            注册一个
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="community-profile">
      <div className="community-profile-head">
        {me.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="community-avatar" src={me.avatar} alt="头像" />
        ) : (
          <span className="community-avatar community-avatar-fallback" aria-hidden="true">
            {me.displayName.slice(0, 1)}
          </span>
        )}
        <div>
          <p className="community-profile-name">
            {me.displayName} <span className="comments-badge">Lv.{me.level}</span>
          </p>
          <p className="community-profile-meta">
            @{me.username} · 已发布 {me.publishedComments} 条评论
          </p>
        </div>
        <button type="button" className="button ghost" onClick={() => void logout()}>
          退出登录
        </button>
      </div>
      <form
        className="community-profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveProfile();
        }}
      >
        <label className="community-field">
          <span>更换头像（100KB 以内的 PNG/JPG/WebP）</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void saveAvatar(file);
            }}
          />
        </label>
        <label className="community-field">
          <span>昵称</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={20}
          />
        </label>
        <label className="community-field">
          <span>一句话签名（选填）</span>
          <input
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={200}
          />
        </label>
        {error && <p className="comments-error">{error}</p>}
        {notice && <p className="comments-notice">{notice}</p>}
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? '保存中…' : '保存资料'}
        </button>
      </form>
    </div>
  );
}

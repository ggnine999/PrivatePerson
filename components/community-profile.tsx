'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Me = {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  level: number;
  publishedComments: number;
  createdAt: number;
};

function joinDays(createdAt: number) {
  return Math.max(1, Math.floor((Date.now() - createdAt) / 86_400_000) + 1);
}

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
      const data = (await response.json()) as { user: Me; csrfToken: string };
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

  useEffect(() => {
    // 未登录：直接送到登录/注册界面
    if (!loading && !me) router.replace('/community/login');
  }, [loading, me, router]);

  async function saveAvatar(file: File) {
    setError('');
    if (file.size > 100 * 1024) {
      setError('头像图片需要 100KB 以内');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : '');
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

  if (loading || !me) {
    return (
      <p className="comments-loading">
        {loading ? '正在确认登录状态…' : '正在前往登录…'}
      </p>
    );
  }

  return (
    <div className="qq-card">
      <div className="qq-banner">
        <button type="button" className="qq-logout" onClick={() => void logout()}>
          退出登录
        </button>
      </div>
      <div className="qq-head">
        {me.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="qq-avatar" src={me.avatar} alt="头像" />
        ) : (
          <span className="qq-avatar qq-avatar-fallback" aria-hidden="true">
            {me.displayName.slice(0, 1)}
          </span>
        )}
        <div className="qq-names">
          <p className="qq-nick">
            {me.displayName}
            <span className="comments-badge">Lv.{me.level}</span>
          </p>
          <p className="qq-uid">@{me.username}</p>
        </div>
      </div>
      <p className="qq-sign">{me.bio || '这个人很懒，什么都没有留下～'}</p>
      <dl className="qq-stats">
        <div>
          <dt>已发布评论</dt>
          <dd>{me.publishedComments}</dd>
        </div>
        <div>
          <dt>加入天数</dt>
          <dd>{joinDays(me.createdAt)}</dd>
        </div>
        <div>
          <dt>等级</dt>
          <dd>Lv.{me.level}</dd>
        </div>
      </dl>
      <form
        className="qq-edit"
        onSubmit={(event) => {
          event.preventDefault();
          void saveProfile();
        }}
      >
        <span className="qq-edit-title">编辑资料</span>
        <label className="qq-edit-field">
          <span>更换头像（100KB 以内 PNG/JPG/WebP）</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void saveAvatar(file);
            }}
          />
        </label>
        <label className="qq-edit-field">
          <span>昵称</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={20}
          />
        </label>
        <label className="qq-edit-field">
          <span>个性签名</span>
          <input
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={200}
            placeholder="写一句个性签名～"
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

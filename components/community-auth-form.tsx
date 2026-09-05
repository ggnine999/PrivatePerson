'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CommunityAuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          displayName: isRegister ? displayName : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? '操作失败，请稍后再试');
        return;
      }
      router.push('/community/me');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="community-auth"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="community-field">
        <span>用户名（3-20 位小写字母、数字、下划线或连字符）</span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label className="community-field">
        <span>密码（8-72 个字符）</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
        />
      </label>
      {isRegister && (
        <label className="community-field">
          <span>昵称（选填，默认同用户名）</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={20}
          />
        </label>
      )}
      {error && <p className="comments-error">{error}</p>}
      <button type="submit" className="button primary" disabled={submitting}>
        {submitting ? '处理中…' : isRegister ? '注册并登录' : '登录'}
      </button>
      <p className="community-switch">
        {isRegister ? (
          <>
            已经有账号了？<Link href="/community/login">去登录</Link>
          </>
        ) : (
          <>
            还没有账号？<Link href="/community/register">注册一个</Link>
          </>
        )}
      </p>
    </form>
  );
}

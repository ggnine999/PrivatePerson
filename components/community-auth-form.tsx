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
      const response = await fetch(
        `/api/community/${isRegister ? 'register' : 'login'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            displayName: isRegister ? displayName : undefined,
          }),
        },
      );
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
    <div className="auth-split">
      <div className="auth-form-side">
        <span className="kicker">COMMUNITY</span>
        <h1>{isRegister ? '欢迎加入' : '欢迎回来'}</h1>
        <p className="auth-sub">
          {isRegister ? (
            <>
              已经有账户了？
              <Link href="/community/login">去登录</Link>
            </>
          ) : (
            <>
              如果你还没有账户，
              <Link href="/community/register">点击注册</Link>
            </>
          )}
        </p>
        <form
          className="auth-fields"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="auth-field">
            <span>用户名*</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="auth-field">
            <span>密码*</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {isRegister && (
            <label className="auth-field">
              <span>
                昵称（选填，不填就和用户名一样；仅用于评论区展示）
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={20}
              />
            </label>
          )}
          {error && <p className="comments-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? '处理中…' : isRegister ? '注册账号' : '登录账号'}
          </button>
        </form>
        <p className="auth-note">
          社区账号仅用于评论互动，和私人保险库完全独立。
        </p>
      </div>
      <div className="auth-art" aria-hidden="true">
        <span className="auth-art-brand">
          星屿手记<small>STARRY NOTES</small>
        </span>
      </div>
    </div>
  );
}

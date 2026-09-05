'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function VaultLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => {
        if (response.ok) location.replace('/vault');
      })
      .catch(() => {});
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const value = (name: string) => {
      const item = form.get(name);
      return typeof item === 'string' ? item : '';
    };
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: value('username'),
          password: value('password'),
          otp: value('otp'),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (response.ok) {
        location.replace('/vault');
        return;
      }
      setError(data.error ?? '登录失败');
    } catch {
      setError('登录服务暂时不可用，请稍后重试。');
    }
    setBusy(false);
  }

  return (
    <main className="vault-login">
      <section>
        <div className="vault-badge">
          <LockKeyhole /> PRIVATE AREA
        </div>
        <h1>进入私人保险库</h1>
        <p>
          登录凭据只用于确认所有者身份；解密数据还需要另一把只留在浏览器内存中的主密码。
        </p>
        <form onSubmit={submit}>
          <label>
            所有者账号
            <input
              name="username"
              autoComplete="username"
              required
              defaultValue={
                process.env.NODE_ENV === 'production' ? '' : 'demo-owner'
              }
            />
          </label>
          <label>
            登录密码
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            双重验证码 <small>仅在服务端配置 TOTP 后必填</small>
            <input
              name="otp"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              placeholder="6 位数字"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? '正在验证…' : '安全登录'} <KeyRound />
          </button>
        </form>
        {process.env.NODE_ENV !== 'production' && (
          <div className="demo-credentials">
            <ShieldCheck />
            <div>
              <strong>仅限本地开发的虚构测试账号</strong>
              <code>demo-owner / Sakura-Demo-2026!</code>
              <span>
                生产环境必须通过环境变量替换，默认测试凭据会自动失效。
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

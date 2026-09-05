'use client';
import Link from 'next/link';
import { Menu, Moon, Sun, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const value = localStorage.getItem('theme');
    const next =
      value === 'dark' ||
      (!value && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', next);
    const timer = setTimeout(() => setDark(next), 0);
    return () => clearTimeout(timer);
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }
  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">星</span>
          <span>
            星屿手记<small>STARRY NOTES</small>
          </span>
        </Link>
        <nav
          className={open ? 'nav-links open' : 'nav-links'}
          aria-label="主导航"
        >
          <Link href="/articles" onClick={() => setOpen(false)}>
            文章
          </Link>
          <Link href="/archive" onClick={() => setOpen(false)}>
            归档
          </Link>
          <Link href="/projects" onClick={() => setOpen(false)}>
            项目
          </Link>
          <Link href="/messages" onClick={() => setOpen(false)}>
            留言板
          </Link>
          <Link href="/links" onClick={() => setOpen(false)}>
            友链
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            关于
          </Link>
        </nav>
        <div className="nav-actions">
          <Link
            className="icon-button"
            href="/community/me"
            aria-label="社区账号：登录、注册或个人资料"
            title="社区账号"
            onClick={() => setOpen(false)}
          >
            <User />
          </Link>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button
            className="icon-button menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="打开导航"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}

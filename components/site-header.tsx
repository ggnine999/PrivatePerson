'use client';
import Link from 'next/link';
import {
  ChevronDown,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { articles } from '@/lib/content';
import { SiteSearch } from '@/components/site-search';

const ARTICLE_CATEGORIES = [...new Set(articles.map((a) => a.category))];
const ARTICLE_TAGS = [...new Set(articles.flatMap((a) => a.tags))].slice(0, 6);

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'articles' | 'about' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const value = localStorage.getItem('theme');
    const next =
      value === 'dark' ||
      (!value && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', next);
    const timer = setTimeout(() => setDark(next), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }
  function closeMenus() {
    setOpen(false);
    setOpenMenu(null);
  }
  return (
    <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
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
          <div
            className={`nav-dropdown ${openMenu === 'articles' ? 'open' : ''}`}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              onClick={() =>
                setOpenMenu(openMenu === 'articles' ? null : 'articles')
              }
              aria-expanded={openMenu === 'articles'}
            >
              文章
              <ChevronDown aria-hidden="true" />
            </button>
            <ul className="dropdown-menu">
              <li>
                <Link href="/articles" onClick={closeMenus}>
                  全部文章
                </Link>
              </li>
              {ARTICLE_CATEGORIES.map((category) => (
                <li key={category}>
                  <Link
                    href={`/articles?category=${encodeURIComponent(category)}`}
                    onClick={closeMenus}
                  >
                    {category}
                  </Link>
                </li>
              ))}
              {ARTICLE_TAGS.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/articles?tag=${encodeURIComponent(tag)}`}
                    onClick={closeMenus}
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/projects" onClick={closeMenus}>
            项目
          </Link>
          <Link href="/messages" onClick={closeMenus}>
            留言板
          </Link>
          <Link href="/links" onClick={closeMenus}>
            友链
          </Link>
          <div
            className={`nav-dropdown ${openMenu === 'about' ? 'open' : ''}`}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'about' ? null : 'about')}
              aria-expanded={openMenu === 'about'}
            >
              关于阿枫
              <ChevronDown aria-hidden="true" />
            </button>
            <ul className="dropdown-menu">
              <li>
                <Link href="/archive" onClick={closeMenus}>
                  归档
                </Link>
              </li>
              <li>
                <Link href="/feed" onClick={closeMenus}>
                  投喂
                </Link>
              </li>
              <li>
                <Link href="/about" onClick={closeMenus}>
                  关于阿枫
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setSearchOpen(true)}
            aria-label="打开全站搜索"
            aria-haspopup="dialog"
          >
            <Search aria-hidden="true" />
          </button>
          <Link
            className="icon-button"
            href="/community/me"
            aria-label="社区账号：登录、注册或个人资料"
            title="社区账号"
            onClick={closeMenus}
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
            onClick={() => {
              setOpen(!open);
              setOpenMenu(null);
            }}
            aria-expanded={open}
            aria-label="打开导航"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

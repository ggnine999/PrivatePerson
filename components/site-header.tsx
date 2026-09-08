'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Hammer,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type HeaderUser = {
  username: string;
  displayName: string;
  avatar: string | null;
  permission: 0 | 1;
};

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'about' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [me, setMe] = useState<HeaderUser | null>(null);
  // 站主会话探测：null=未知，true=已登录站主（显示创作工坊入口）
  const [ownerAuthed, setOwnerAuthed] = useState(false);
  const pathname = usePathname();
  const isSection = (...paths: string[]) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const articlesActive = isSection('/articles');
  const gamesActive = isSection('/games');
  const aboutActive = isSection(
    '/about',
    '/archive',
    '/feed',
    '/anime',
    '/photos',
    '/collect',
  );
  const loadUser = useCallback(async () => {
    try {
      const response = await fetch('/api/community/me');
      if (!response.ok) {
        setMe(null);
        return;
      }
      const data = (await response.json()) as { user: HeaderUser | null };
      setMe(data.user);
    } catch {
      setMe(null);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void loadUser(), 0);
    return () => clearTimeout(timer);
  }, [loadUser, pathname]);
  // 站主会话探测：登录后导航栏出现创作工坊入口，访客不可见
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      fetch('/api/auth/session')
        .then(async (response) => {
          if (!alive) return;
          if (!response.ok) {
            setOwnerAuthed(false);
            return;
          }
          const data = (await response.json()) as { authenticated?: boolean };
          setOwnerAuthed(Boolean(data.authenticated));
        })
        .catch(() => {
          if (alive) setOwnerAuthed(false);
        });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [pathname]);
  async function logout() {
    await fetch('/api/community/logout', { method: 'POST' });
    setMe(null);
    window.location.reload();
  }
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
          <Link
            href="/articles"
            className={articlesActive ? 'active' : undefined}
            aria-current={articlesActive ? 'page' : undefined}
            onClick={closeMenus}
          >
            文章
          </Link>
          <Link
            href="/projects"
            className={isSection('/projects') ? 'active' : undefined}
            aria-current={isSection('/projects') ? 'page' : undefined}
            onClick={closeMenus}
          >
            项目
          </Link>
          <Link
            href="/games"
            className={gamesActive ? 'active' : undefined}
            aria-current={gamesActive ? 'page' : undefined}
            onClick={closeMenus}
          >
            游戏
          </Link>
          <Link
            href="/messages"
            className={isSection('/messages') ? 'active' : undefined}
            aria-current={isSection('/messages') ? 'page' : undefined}
            onClick={closeMenus}
          >
            留言板
          </Link>
          <Link
            href="/moments"
            className={isSection('/moments') ? 'active' : undefined}
            aria-current={isSection('/moments') ? 'page' : undefined}
            onClick={closeMenus}
          >
            说说
          </Link>
          <Link
            href="/links"
            className={isSection('/links') ? 'active' : undefined}
            aria-current={isSection('/links') ? 'page' : undefined}
            onClick={closeMenus}
          >
            友链
          </Link>
          <div
            className={`nav-dropdown ${openMenu === 'about' ? 'open' : ''}`}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              type="button"
              className={aboutActive ? 'active' : undefined}
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
                <Link href="/anime" onClick={closeMenus}>
                  追番
                </Link>
              </li>
              <li>
                <Link href="/photos" onClick={closeMenus}>
                  相册
                </Link>
              </li>
              <li>
                <Link href="/collect" onClick={closeMenus}>
                  收藏
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
          {me?.permission === 1 && !ownerAuthed && (
            <Link
              className="icon-button nav-studio-link"
              href="/vault/login"
              title="�X��"
              aria-label="�e�X��"
              onClick={closeMenus}
            >
              <KeyRound aria-hidden="true" />
            </Link>
          )}
          {ownerAuthed && (
            <Link
              className="icon-button nav-studio-link"
              href="/studio"
              title="创作工坊：管理文章、项目与说说"
              aria-label="创作工坊"
              onClick={closeMenus}
            >
              <Hammer aria-hidden="true" />
            </Link>
          )}
          {me ? (
            <div className="nav-user">
              <Link
                className="nav-user-chip"
                href="/community/me"
                title="个人资料"
                onClick={closeMenus}
              >
                {me.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="nav-user-avatar" src={me.avatar} alt="" />
                ) : (
                  <span
                    className="nav-user-avatar nav-user-avatar-fallback"
                    aria-hidden="true"
                  >
                    {me.displayName.slice(0, 1)}
                  </span>
                )}
                <span className="nav-user-name">{me.displayName}</span>
              </Link>
              <div className="nav-user-menu">
                <button type="button" onClick={() => void logout()}>
                  <LogOut aria-hidden="true" /> 退出登录
                </button>
              </div>
            </div>
          ) : (
            <Link
              className="icon-button"
              href="/community/me"
              aria-label="社区账号：登录、注册或个人资料"
              title="社区账号"
              onClick={closeMenus}
            >
              <User />
            </Link>
          )}
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
    </header>
  );
}

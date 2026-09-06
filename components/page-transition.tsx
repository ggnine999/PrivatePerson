'use client';

import { usePathname } from 'next/navigation';
import mascotManifest from '@/lib/mascots.generated.json';
import { useCallback, useEffect, useRef, useState } from 'react';

const MASCOTS = mascotManifest.mascots.map((m) => `/images/mascots/${m.file}`);

// 页面切换过渡：站内导航时全屏展示品牌色 + 吉祥物弹跳，路由完成后淡出。
// 拦截站内链接点击与浏览器前进后退；最短展示 420ms 防闪烁，最长 4s 兜底防困住。
export function PageTransition() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mascot, setMascot] = useState(MASCOTS[0]);
  const shownAtRef = useRef(0);
  const firstRender = useRef(true);

  const show = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setMascot(MASCOTS[Math.floor(Math.random() * MASCOTS.length)]);
    shownAtRef.current = performance.now();
    setVisible(true);
  }, []);

  // 新页面渲染完成（路由变化）→ 最短展示时长后淡出
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const elapsed = performance.now() - shownAtRef.current;
    const timer = setTimeout(() => setVisible(false), Math.max(0, 420 - elapsed));
    return () => clearTimeout(timer);
  }, [pathname]);

  // 拦截站内链接点击（捕获阶段，先于 React 路由）与前进后退
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download'))
        return;
      if (/^(https?:|mailto:|tel:)/.test(href)) return;
      try {
        const target = new URL(anchor.href, location.href);
        if (target.origin !== location.origin) return;
        if (target.pathname + target.search === location.pathname + location.search) return;
      } catch {
        return;
      }
      show();
    };
    const onPop = () => show();
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [show]);

  // 兜底：导航异常时最多展示 4 秒，不困住用户
  useEffect(() => {
    if (!visible) return;
    const failsafe = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(failsafe);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="page-transition" aria-hidden="true">
      <div className="page-transition-bar" />
      <div
        className="page-transition-cat"
        style={{ backgroundImage: `url('${mascot}')` }}
      />
      <div className="page-transition-shadow" />
    </div>
  );
}

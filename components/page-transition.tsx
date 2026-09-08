'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

// 页面切换过渡：保留全屏遮罩与居中加载圈，路由完成后消失。
// 拦截站内链接点击与浏览器前进后退；最短展示 420ms 防闪烁，最长 4s 兜底防困住。
export function PageTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const firstRender = useRef(true);

  const show = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    shownAtRef.current = performance.now();
    setVisible(true);
  }, []);

  // 新页面或同页查询条件渲染完成后，满足最短展示时长再淡出。
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const elapsed = performance.now() - shownAtRef.current;
    const timer = setTimeout(
      () => setVisible(false),
      Math.max(0, 420 - elapsed),
    );
    return () => clearTimeout(timer);
  }, [routeKey]);

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
      if (
        !href ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      if (/^(https?:|mailto:|tel:)/.test(href)) return;
      try {
        const target = new URL(anchor.href, location.href);
        if (target.origin !== location.origin) return;
        if (
          target.pathname + target.search ===
          location.pathname + location.search
        )
          return;
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

  useEffect(() => {
    if (!visible) return;
    const failsafe = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(failsafe);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="page-transition" aria-hidden="true">
      <div className="page-transition-spinner" />
    </div>
  );
}

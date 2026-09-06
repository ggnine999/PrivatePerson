'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// 页面切换反馈：路由变化即从顶部滑入一段渐变光条（450ms）。
// 首次渲染不触发；尊重系统"减少动态"偏好。
export function TopProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const show = setTimeout(() => setActive(true), 0);
    const timer = setTimeout(() => setActive(false), 500);
    return () => {
      clearTimeout(show);
      clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div
      className={`top-progress${active ? ' is-active' : ''}`}
      aria-hidden="true"
    />
  );
}

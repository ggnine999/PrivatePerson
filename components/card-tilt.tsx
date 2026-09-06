'use client';

import { useEffect } from 'react';

// 全站卡片 3D 倾斜 + 光泽：鼠标跟随写入 CSS 变量。
// 同时在入场动画（view() 时间线）结束后解除动画占用，让倾斜接管变换。
const CARD_SELECTOR =
  '.article-card, .project-card, .game-card, .studio-link-card';

export function CardTilt() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bound = new WeakSet<Element>();

    const onMove = (event: MouseEvent) => {
      const el = event.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * 11).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--tilt-scale', '1.025');
    };

    const onLeave = (event: MouseEvent) => {
      const el = event.currentTarget as HTMLElement;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--tilt-scale', '1');
    };

    // 入场动画结束前，动画会接管 transform；结束后标记解除，倾斜才能生效
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== 'site-card-in') return;
      const el = event.currentTarget as HTMLElement;
      el.style.animation = 'none';
      el.classList.add('is-in');
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((el) => {
        if (bound.has(el)) return;
        bound.add(el);
        el.classList.add('card-tilt');
        const glare = document.createElement('div');
        glare.className = 'card-glare';
        el.appendChild(glare);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('animationend', onAnimationEnd);
      });
    };

    scan();
    // 路由切换后新卡片也需要绑定
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return null;
}

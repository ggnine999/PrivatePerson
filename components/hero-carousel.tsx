'use client';

import { useEffect, useState } from 'react';
import type { HeroSlide } from '@/lib/content';

const INTERVAL_MS = 7000;

// 首页封面轮播：全部图层常驻堆叠、透明度过渡切换；
// tone 标在容器上，标题文字颜色由 CSS :has 按当前滑块自适应。
// prefers-reduced-motion 下不自动轮播，仍可点指示点切换。
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setAutoPlay(false);
    }
  }, []);

  useEffect(() => {
    if (!autoPlay || slides.length < 2) return;
    const timer = setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [autoPlay, slides.length]);

  const tone = slides[active]?.tone === 'dark' ? 'dark' : 'light';

  return (
    <div className="hero-carousel" data-tone={tone}>
      <div aria-hidden="true">
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={index === active ? 'active' : ''}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <div className="hero-dots" role="group" aria-label="切换封面背景">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              className={index === active ? 'active' : ''}
              aria-label={`切换到背景：${slide.alt}`}
              aria-current={index === active}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        当前封面：{slides[active]?.alt}
      </p>
    </div>
  );
}

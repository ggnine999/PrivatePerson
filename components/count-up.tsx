'use client';

import { useEffect, useRef, useState } from 'react';

// 数字滚动：元素进入视口后从 0 缓动计数到目标值。
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started.current)
          return;
        started.current = true;
        io.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setDisplay(value);
          return;
        }
        const t0 = performance.now();
        const duration = 900;
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - k, 3);
          setDisplay(Math.round(value * eased));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'sakura-fall';
const PETAL_COLORS = [
  'rgba(255, 183, 213, 0.85)',
  'rgba(255, 214, 232, 0.85)',
  'rgba(255, 170, 200, 0.8)',
];

type Petal = {
  baseX: number;
  y: number;
  size: number;
  speedY: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  rotation: number;
  rotSpeed: number;
  color: string;
};

export function SakuraFall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null = 尚未读取用户偏好
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setEnabled(stored === null ? !reduced : stored === 'on');
    });
  }, []);

  useEffect(() => {
    if (enabled === null) return;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;
    let petals: Petal[] = [];

    const spawn = (fromTop: boolean): Petal => {
      const size = 4 + Math.random() * 5;
      return {
        baseX: Math.random() * Math.max(width, 1),
        y: fromTop ? -size * 2 : Math.random() * Math.max(height, 1),
        size,
        speedY: 0.5 + Math.random() * 0.9,
        swayAmp: 14 + Math.random() * 26,
        swayFreq: 0.4 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      };
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const step = () => {
      if (!running) return;
      context.clearRect(0, 0, width, height);
      for (const petal of petals) {
        petal.y += petal.speedY;
        petal.phase += petal.swayFreq * 0.016;
        petal.rotation += petal.rotSpeed;
        const x = petal.baseX + Math.sin(petal.phase) * petal.swayAmp;
        if (petal.y > height + petal.size * 2) {
          Object.assign(petal, spawn(true));
          continue;
        }
        context.save();
        context.translate(x, petal.y);
        context.rotate(petal.rotation);
        context.fillStyle = petal.color;
        context.beginPath();
        context.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      frame = window.requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        running = false;
      } else if (!running) {
        running = true;
        frame = window.requestAnimationFrame(step);
      }
    };

    resize();
    const count = Math.min(20, Math.max(10, Math.round(width / 70)));
    petals = Array.from({ length: count }, () => spawn(false));
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    frame = window.requestAnimationFrame(step);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [enabled]);

  return (
    <>
      <canvas ref={canvasRef} className="sakura-canvas" aria-hidden="true" />
      <button
        type="button"
        className="sakura-toggle"
        aria-pressed={enabled === true}
        aria-label={enabled ? '关闭樱花飘落特效' : '开启樱花飘落特效'}
        title={enabled ? '关闭樱花特效' : '开启樱花特效'}
        onClick={() => setEnabled((value) => !value)}
        disabled={enabled === null}
      >
        <span aria-hidden="true">🌸</span>
      </button>
    </>
  );
}

'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PhotoEntry } from '@/lib/content';

// 相册网格 + 灯箱：点击任意一张全屏查看，Esc 或关闭按钮退出。
// 灯箱用 showModal() 打开：进入浏览器顶层渲染层，不被导航遮挡。
export function PhotoGallery({ items }: { items: PhotoEntry[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active !== null && !dialog.open) dialog.showModal();
    if (active === null && dialog.open) dialog.close();
  }, [active]);
  return (
    <>
      <div className="photo-grid">
        {items.map((photo, index) => (
          <figure className="photo-card" key={photo.src}>
            <button
              type="button"
              className="photo-thumb"
              onClick={() => setActive(index)}
              aria-label={`查看大图：${photo.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.title} loading="lazy" />
            </button>
            <figcaption>
              <strong>{photo.title}</strong>
              <span>
                {photo.date} · {photo.note}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      {active !== null && items[active] && (
        <dialog
          ref={dialogRef}
          className="lightbox"
          onClose={() => setActive(null)}
          aria-label="图片预览"
        >
          <button aria-label="关闭预览" onClick={() => setActive(null)}>
            <X />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={items[active].src} alt={items[active].title} />
          <p>
            {items[active].title} · {items[active].note}
          </p>
        </dialog>
      )}
    </>
  );
}

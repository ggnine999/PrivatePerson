'use client';

import { useEffect } from 'react';

// 为文章正文里的代码块追加复制按钮（渐进增强，不影响 SSR 输出）。
// 以 key=slug 挂载，切换文章时重新扫描。
export function CodeCopyEnhancer() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>('.prose pre');
    const cleanup: Array<() => void> = [];
    for (const block of blocks) {
      if (block.querySelector('.code-copy')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = '复制';
      button.addEventListener('click', () => {
        const code = block.querySelector('code');
        navigator.clipboard
          .writeText(code?.innerText ?? '')
          .then(() => {
            button.textContent = '已复制 ✓';
          })
          .catch(() => {
            button.textContent = '复制失败';
          })
          .finally(() => {
            setTimeout(() => {
              button.textContent = '复制';
            }, 1600);
          });
      });
      block.appendChild(button);
      cleanup.push(() => button.remove());
    }
    return () => {
      for (const remove of cleanup) remove();
    };
  }, []);
  return null;
}

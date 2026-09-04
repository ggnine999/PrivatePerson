'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const LINES = [
  '今天也要元气满满哦！',
  '写累了就休息一下，我陪你。',
  '歌词会跟着歌走，我会跟着你。',
  '保险库的密码，可不要忘啦。',
  '夜深了，记得早点休息。',
  '嘘——我藏在壁纸里很久啦。',
];
const DISMISS_KEY = 'kanban-dismissed';

// 轻量看板娘：壁纸人物的裁剪立绘 + 点击换台词气泡，可关闭（localStorage 记忆）。
export function KanbanMusume() {
  const [dismissed, setDismissed] = useState(true);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    // 微任务里读 localStorage：避开 SSR，也满足 react-compiler 的同步约束
    queueMicrotask(() => {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    });
  }, []);

  if (dismissed) return null;

  return (
    <div className="kanban-musume">
      <p className="kanban-bubble">{LINES[lineIndex]}</p>
      <div className="kanban-row">
        <button
          type="button"
          className="kanban-figure"
          onClick={() => setLineIndex((index) => (index + 1) % LINES.length)}
          aria-label="看板娘：点击换一句台词"
        >
          <span className="kanban-figure-art" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="kanban-close"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          aria-label="关闭看板娘"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

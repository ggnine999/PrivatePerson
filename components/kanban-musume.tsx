'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import mascotManifest from '@/lib/mascots.generated.json';

const LINES = [
  '今天也要元气满满哦！',
  '写累了就休息一下，我陪你。',
  '歌词会跟着歌走，我会跟着你。',
  '保险库的密码，可不要忘啦。',
  '夜深了，记得早点休息。',
  '嘘——我藏在壁纸里很久啦。',
];
const DISMISS_KEY = 'kanban-dismissed';

// 轻量看板娘：public/images/mascots/ 里的卡通形象轮换登场（贴纸卡样式），
// 点击切换角色与台词，可关闭（localStorage 记忆）。
export function KanbanMusume() {
  const [dismissed, setDismissed] = useState(true);
  const [index, setIndex] = useState(0);
  const mascots = mascotManifest.mascots;

  useEffect(() => {
    // 微任务里读 localStorage：避开 SSR，也满足 react-compiler 的同步约束
    queueMicrotask(() => {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    });
  }, []);

  if (dismissed || mascots.length === 0) return null;

  const mascot = mascots[index % mascots.length];
  const line = LINES[index % LINES.length];

  return (
    <div className="kanban-musume">
      <p className="kanban-bubble">{line}</p>
      <div className="kanban-row">
        <button
          type="button"
          className="kanban-figure"
          style={{ backgroundImage: `url('/images/mascots/${mascot.file}')` }}
          onClick={() => setIndex((value) => value + 1)}
          aria-label="看板娘：点击换一个伙伴和台词"
        />
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

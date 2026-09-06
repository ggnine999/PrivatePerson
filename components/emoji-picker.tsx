'use client';

import { Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// 颜文字与常用表情清单（纯文本插入，不依赖任何外部资源）。
export const COMMENT_FACES = [
  '(｡･ω･｡)',
  '(≧▽≦)',
  '(´,,•ω•,,)♡',
  'φ(゜▽゜*)♪',
  '(・ω<)☆',
  'ヾ(≧▽≦*)o',
  '(๑•̀ㅂ•́)و✧',
  '(￣▽￣)',
  '(T_T)',
  '(＞﹏＜)',
  'Σ(っ°Д°;)っ',
  '(๑¯◡¯๑)',
  'ε=(´ο｀*))',
  '(๑´ㅂ`๑)',
  '🌸',
  '✨',
  '🎉',
  '👍',
];

// 表情选择器：点击清单项后由父组件把文本插入到光标位置。
export function EmojiPicker({ onPick }: { onPick: (face: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);
  return (
    <div className="emoji-picker" ref={rootRef}>
      <button
        type="button"
        className="emoji-picker-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="插入表情"
      >
        <Smile aria-hidden="true" />
        <span aria-hidden="true">表情</span>
      </button>
      {open && (
        <div className="emoji-picker-menu" aria-label="表情清单">
          {COMMENT_FACES.map((face) => (
            <button
              key={face}
              type="button"
              className="emoji-picker-item"
              onClick={() => {
                onPick(face);
                setOpen(false);
              }}
            >
              {face}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

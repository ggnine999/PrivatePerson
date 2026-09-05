'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { articles, projects } from '@/lib/content';

// 全站搜索弹窗：文章 + 项目客户端即时过滤（数据来自静态内容，无需接口）。
// 使用原生 <dialog>：Esc 关闭、点击背板关闭、焦点管理均为浏览器原生行为。
export function SiteSearch({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }, []);

  // 点击背板（dialog 本体）关闭；面板内的点击不受影响
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const articleHits = useMemo(
    () =>
      articles
        .filter((article) =>
          `${article.title}${article.description}${article.category}${article.tags.join('')}`
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 6),
    [q],
  );
  const projectHits = useMemo(
    () =>
      projects
        .filter((project) =>
          `${project.name}${project.description}${project.tech.join('')}`
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 4),
    [q],
  );
  const total = articleHits.length + projectHits.length;

  return (
    <dialog
      ref={dialogRef}
      className="site-search"
      aria-label="全站搜索"
      onClose={onClose}
    >
      <label className="site-search-box">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索文章、项目、标签…"
          aria-label="全站搜索"
          maxLength={60}
        />
        <kbd aria-hidden="true">Esc</kbd>
      </label>
      {q === '' ? (
        <p className="site-search-hint">输入关键词，搜索站内的全部文章与项目。</p>
      ) : total === 0 ? (
        <p className="site-search-hint">没有找到「{query}」相关的内容。</p>
      ) : (
        <>
          {articleHits.length > 0 && <p className="site-search-group">文章</p>}
          <ul>
            {articleHits.map((article) => (
              <li key={article.slug}>
                <Link href={`/articles/${article.slug}`} onClick={onClose}>
                  <strong>{article.title}</strong>
                  <span>
                    {article.category} · {article.readingMinutes} 分钟阅读
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {projectHits.length > 0 && <p className="site-search-group">项目</p>}
          <ul>
            {projectHits.map((project) => (
              <li key={project.slug}>
                <a href={project.website} target="_blank" rel="noopener noreferrer">
                  <strong>{project.name}</strong>
                  <span>{project.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </dialog>
  );
}

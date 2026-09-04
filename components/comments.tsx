'use client';

import { useEffect, useRef } from 'react';

// Giscus（基于 GitHub Discussions 的免服务端评论）。
// 配置写入 .env 的 NEXT_PUBLIC_GISCUS_* 变量，未配置时显示占位提示。
const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? 'Announcements';
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

const configured = Boolean(REPO && REPO_ID && CATEGORY_ID);

export function Comments() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', REPO as string);
    script.setAttribute('data-repo-id', REPO_ID as string);
    script.setAttribute('data-category', CATEGORY);
    script.setAttribute('data-category-id', CATEGORY_ID as string);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, []);

  if (!configured) {
    return (
      <section className="comments" aria-label="评论区">
        <p className="comments-hint">
          评论区尚未启用。站点所有者配置 Giscus（基于 GitHub
          Discussions 的免服务端评论系统）后，这里会出现评论框。
        </p>
      </section>
    );
  }

  return (
    <section className="comments" aria-label="评论区">
      <div ref={containerRef} className="giscus-container" />
    </section>
  );
}

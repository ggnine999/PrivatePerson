'use client';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Article } from '@/lib/content';
export function ArticleBrowser({
  articles,
  initialQuery = '',
  initialCategory,
}: {
  articles: Article[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory ?? '全部');
  const categories = ['全部', ...new Set(articles.map((a) => a.category))];
  const results = useMemo(
    () =>
      articles.filter(
        (a) =>
          (category === '全部' || a.category === category) &&
          `${a.title}${a.description}${a.tags.join('')}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [articles, category, query],
  );
  return (
    <>
      <div className="filter-bar">
        <label className="search-box">
          <Search />
          <span className="sr-only">搜索文章</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、摘要或标签…"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="清空搜索">
              <X />
            </button>
          )}
        </label>
        <fieldset className="filter-chips">
          <legend className="sr-only">按分类筛选</legend>
          {categories.map((item) => (
            <button
              type="button"
              className={category === item ? 'active' : ''}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="result-count">找到 {results.length} 篇文章</p>
      <div className="article-list">
        {results.map((article) => (
          <article key={article.slug}>
            <div className="article-list-date">
              <strong>{article.publishedAt.slice(8)}</strong>
              <span>{article.publishedAt.slice(0, 7)}</span>
            </div>
            <div>
              <div className="meta">
                <span>{article.category}</span>
                <span>{article.readingMinutes} 分钟</span>
              </div>
              <h2>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </h2>
              <p>{article.description}</p>
              <div className="tags">
                {article.tags.map((tag) => (
                  <Link
                    href={`/articles?tag=${encodeURIComponent(tag)}`}
                    key={tag}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!results.length && (
        <div className="empty-state">
          <Search />
          <h2>没有找到相符文章</h2>
          <p>换个关键词或分类试试看。</p>
        </div>
      )}
    </>
  );
}

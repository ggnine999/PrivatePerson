import { env } from 'cloudflare:workers';

// 站点内容数据层：文章与项目的 D1 存取（站主 CRUD + 全站渲染共用）。
// 行列 snake_case ↔ 类型 camelCase；tags/tech 以 JSON 文本存储。

export type ArticleStatus = 'published' | 'draft';

export type SiteArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  featured: boolean;
  status: ArticleStatus;
  content: string;
};

export type SiteProject = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tech: string[];
  status: string;
  website: string;
  repository: string | null;
  featured: boolean;
  mark: string;
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  published_at: string;
  updated_at: string;
  reading_minutes: number;
  featured: number;
  status: string;
  content: string;
};

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tech: string;
  status: string;
  website: string;
  repository: string | null;
  featured: number;
  mark: string;
};

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapArticle(row: ArticleRow): SiteArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    tags: parseJsonArray(row.tags),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingMinutes: row.reading_minutes,
    featured: row.featured === 1,
    status: row.status === 'draft' ? 'draft' : 'published',
    content: row.content,
  };
}

function mapProject(row: ProjectRow): SiteProject {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    tech: parseJsonArray(row.tech),
    status: row.status,
    website: row.website,
    repository: row.repository,
    featured: row.featured === 1,
    mark: row.mark,
  };
}

const ARTICLE_COLUMNS =
  'id, slug, title, description, category, tags, published_at, updated_at, reading_minutes, featured, status, content';
const PROJECT_COLUMNS =
  'id, slug, name, description, category, tech, status, website, repository, featured, mark';

// ===== 文章 =====

export type ArticleMeta = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  featured: boolean;
  status: ArticleStatus;
};

const ARTICLE_META_COLUMNS =
  'id, slug, title, description, category, tags, published_at, updated_at, reading_minutes, featured, status';

function mapArticleMeta(row: ArticleRow): ArticleMeta {
  const { content: _content, ...meta } = mapArticle(row);
  return meta;
}

/** 轻量元信息列表（不含正文），供页脚/搜索/统计校验等轻量场景使用 */
export async function listPublishedArticleMetas(
  limit = 200,
): Promise<ArticleMeta[]> {
  const result = await db()
    .prepare(
      `SELECT ${ARTICLE_META_COLUMNS} FROM articles
       WHERE status = 'published' ORDER BY published_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<ArticleRow>();
  return (result.results ?? []).map(mapArticleMeta);
}

export async function listPublishedArticles(limit = 100): Promise<SiteArticle[]> {
  const result = await db()
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} FROM articles
       WHERE status = 'published' ORDER BY published_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<ArticleRow>();
  return (result.results ?? []).map(mapArticle);
}

export async function listAllArticles(): Promise<SiteArticle[]> {
  const result = await db()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles ORDER BY modified_at DESC`)
    .all<ArticleRow>();
  return (result.results ?? []).map(mapArticle);
}

export async function getArticleBySlug(
  slug: string,
  options?: { includeDrafts?: boolean },
): Promise<SiteArticle | null> {
  const row = await db()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE slug = ?`)
    .bind(slug)
    .first<ArticleRow>();
  if (!row) return null;
  const article = mapArticle(row);
  if (article.status !== 'published' && !options?.includeDrafts) return null;
  return article;
}

export async function getArticleById(id: string): Promise<SiteArticle | null> {
  const row = await db()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE id = ?`)
    .bind(id)
    .first<ArticleRow>();
  return row ? mapArticle(row) : null;
}

export async function articleSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const row = await db()
    .prepare('SELECT id FROM articles WHERE slug = ? AND id != ?')
    .bind(slug, excludeId ?? '')
    .first<{ id: string }>();
  return Boolean(row);
}

export async function createArticle(input: SiteArticle & { id: string }): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO articles
         (id, slug, title, description, category, tags, published_at, updated_at,
          reading_minutes, featured, status, content, created_at, modified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.slug,
      input.title,
      input.description,
      input.category,
      JSON.stringify(input.tags),
      input.publishedAt,
      input.updatedAt,
      input.readingMinutes,
      input.featured ? 1 : 0,
      input.status,
      input.content,
      Date.now(),
      Date.now(),
    )
    .run();
}

export async function updateArticle(
  id: string,
  patch: Partial<Omit<SiteArticle, 'id'>>,
): Promise<boolean> {
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  const push = (column: string, value: string | number) => {
    sets.push(`${column} = ?`);
    binds.push(value);
  };
  if (patch.slug !== undefined) push('slug', patch.slug);
  if (patch.title !== undefined) push('title', patch.title);
  if (patch.description !== undefined) push('description', patch.description);
  if (patch.category !== undefined) push('category', patch.category);
  if (patch.tags !== undefined) push('tags', JSON.stringify(patch.tags));
  if (patch.publishedAt !== undefined) push('published_at', patch.publishedAt);
  if (patch.updatedAt !== undefined) push('updated_at', patch.updatedAt);
  if (patch.readingMinutes !== undefined) push('reading_minutes', patch.readingMinutes);
  if (patch.featured !== undefined) push('featured', patch.featured ? 1 : 0);
  if (patch.status !== undefined) push('status', patch.status);
  if (patch.content !== undefined) push('content', patch.content);
  if (sets.length === 0) return true;
  sets.push('modified_at = ?');
  binds.push(Date.now());
  binds.push(id);
  const result = await db()
    .prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const result = await db().prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

// ===== 项目 =====

export async function listPublishedProjects(): Promise<SiteProject[]> {
  const result = await db()
    .prepare(`SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY featured DESC, rowid ASC`)
    .all<ProjectRow>();
  return (result.results ?? []).map(mapProject);
}

export async function listAllProjects(): Promise<SiteProject[]> {
  const result = await db()
    .prepare(`SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY modified_at DESC`)
    .all<ProjectRow>();
  return (result.results ?? []).map(mapProject);
}

export async function getProjectById(id: string): Promise<SiteProject | null> {
  const row = await db()
    .prepare(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`)
    .bind(id)
    .first<ProjectRow>();
  return row ? mapProject(row) : null;
}

export async function projectSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const row = await db()
    .prepare('SELECT id FROM projects WHERE slug = ? AND id != ?')
    .bind(slug, excludeId ?? '')
    .first<{ id: string }>();
  return Boolean(row);
}

export async function createProject(input: SiteProject & { id: string }): Promise<void> {
  await db()
    .prepare(
      `INSERT INTO projects
         (id, slug, name, description, category, tech, status, website, repository,
          featured, mark, created_at, modified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.slug,
      input.name,
      input.description,
      input.category,
      JSON.stringify(input.tech),
      input.status,
      input.website,
      input.repository,
      input.featured ? 1 : 0,
      input.mark,
      Date.now(),
      Date.now(),
    )
    .run();
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<SiteProject, 'id'>>,
): Promise<boolean> {
  const sets: string[] = [];
  const binds: (string | number | null)[] = [];
  const push = (column: string, value: string | number | null) => {
    sets.push(`${column} = ?`);
    binds.push(value);
  };
  if (patch.slug !== undefined) push('slug', patch.slug);
  if (patch.name !== undefined) push('name', patch.name);
  if (patch.description !== undefined) push('description', patch.description);
  if (patch.category !== undefined) push('category', patch.category);
  if (patch.tech !== undefined) push('tech', JSON.stringify(patch.tech));
  if (patch.status !== undefined) push('status', patch.status);
  if (patch.website !== undefined) push('website', patch.website);
  if (patch.repository !== undefined) push('repository', patch.repository);
  if (patch.featured !== undefined) push('featured', patch.featured ? 1 : 0);
  if (patch.mark !== undefined) push('mark', patch.mark);
  if (sets.length === 0) return true;
  sets.push('modified_at = ?');
  binds.push(Date.now());
  binds.push(id);
  const result = await db()
    .prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await db().prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

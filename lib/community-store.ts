import { env } from 'cloudflare:workers';
import { randomToken } from '@/lib/security';

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

export type CommentRow = {
  id: string;
  parentId: string | null;
  authorType: 'member' | 'guest';
  authorName: string;
  content: string;
  createdAt: number;
};

export async function listArticleComments(slug: string): Promise<CommentRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, parent_id, author_type, author_name, content, created_at
       FROM article_comments
       WHERE article_slug = ? AND status = 'published'
       ORDER BY created_at ASC
       LIMIT 200`,
    )
    .bind(slug)
    .all<{
      id: string;
      parent_id: string | null;
      author_type: string;
      author_name: string;
      content: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    authorType: row.author_type === 'member' ? 'member' : 'guest',
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function commentBelongsToSlug(id: string, slug: string) {
  const row = await db()
    .prepare(
      'SELECT id FROM article_comments WHERE id = ? AND article_slug = ? AND status = ?',
    )
    .bind(id, slug, 'published')
    .first<{ id: string }>();
  return Boolean(row);
}

export async function createArticleComment(input: {
  slug: string;
  parentId: string | null;
  authorType: 'member' | 'guest';
  authorUserId: string | null;
  authorName: string;
  content: string;
  status: 'published' | 'pending';
}) {
  const id = randomToken();
  await db()
    .prepare(
      `INSERT INTO article_comments
         (id, article_slug, parent_id, author_type, author_user_id, author_name, content, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.slug,
      input.parentId,
      input.authorType,
      input.authorUserId,
      input.authorName,
      input.content,
      input.status,
      Date.now(),
    )
    .run();
  return id;
}

export async function listSiteMessages(): Promise<CommentRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, author_type, author_name, content, created_at
       FROM site_messages WHERE status = 'published'
       ORDER BY created_at DESC LIMIT 100`,
    )
    .all<{
      id: string;
      author_type: string;
      author_name: string;
      content: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    parentId: null,
    authorType: row.author_type === 'member' ? 'member' : 'guest',
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function createSiteMessage(input: {
  authorType: 'member' | 'guest';
  authorUserId: string | null;
  authorName: string;
  content: string;
  status: 'published' | 'pending';
}) {
  const id = randomToken();
  await db()
    .prepare(
      `INSERT INTO site_messages
         (id, author_type, author_user_id, author_name, content, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.authorType,
      input.authorUserId,
      input.authorName,
      input.content,
      input.status,
      Date.now(),
    )
    .run();
  return id;
}

export type FriendLinkRow = {
  id: string;
  name: string;
  url: string;
  description: string;
  createdAt: number;
};

export async function listFriendLinks(): Promise<FriendLinkRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, name, url, description, created_at FROM friend_links
       WHERE status = 'approved' ORDER BY created_at ASC LIMIT 100`,
    )
    .all<{
      id: string;
      name: string;
      url: string;
      description: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    createdAt: row.created_at,
  }));
}

export async function createFriendLinkSubmission(input: {
  name: string;
  url: string;
  description: string;
}) {
  const id = randomToken();
  await db()
    .prepare(
      `INSERT INTO friend_links (id, name, url, description, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(id, input.name, input.url, input.description, Date.now())
    .run();
  return id;
}

export type PendingItem = { id: string; author: string; content: string; createdAt: number };

export async function listPendingComments(): Promise<
  (PendingItem & { slug: string })[]
> {
  const result = await db()
    .prepare(
      `SELECT id, article_slug, author_name, content, created_at FROM article_comments
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
    )
    .all<{
      id: string;
      article_slug: string;
      author_name: string;
      content: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    slug: row.article_slug,
    author: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function listPendingMessages(): Promise<PendingItem[]> {
  const result = await db()
    .prepare(
      `SELECT id, author_name, content, created_at FROM site_messages
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
    )
    .all<{ id: string; author_name: string; content: string; created_at: number }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    author: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function listPendingLinks(): Promise<
  (PendingItem & { url: string })[]
> {
  const result = await db()
    .prepare(
      `SELECT id, name, url, description, created_at FROM friend_links
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
    )
    .all<{
      id: string;
      name: string;
      url: string;
      description: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    author: row.name,
    content: row.description || row.url,
    createdAt: row.created_at,
    url: row.url,
  }));
}

export async function approveContent(
  type: 'comment' | 'message' | 'link',
  id: string,
) {
  const table =
    type === 'comment'
      ? 'article_comments'
      : type === 'message'
        ? 'site_messages'
        : 'friend_links';
  const status = type === 'link' ? 'approved' : 'published';
  await db()
    .prepare(`UPDATE ${table} SET status = ? WHERE id = ?`)
    .bind(status, id)
    .run();
}

export async function deleteContent(
  type: 'comment' | 'message' | 'link',
  id: string,
) {
  const table =
    type === 'comment'
      ? 'article_comments'
      : type === 'message'
        ? 'site_messages'
        : 'friend_links';
  await db().prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
}

export type ReaderRow = {
  username: string;
  displayName: string;
  avatar: string | null;
  publishedComments: number;
  joinedAt: number;
};

export async function listReaders(limit = 60): Promise<ReaderRow[]> {
  const result = await db()
    .prepare(
      `SELECT u.username, u.display_name, u.avatar, u.created_at,
              COUNT(c.id) AS published_comments
       FROM community_users u
       JOIN article_comments c
         ON c.author_user_id = u.id
        AND c.author_type = 'member'
        AND c.status = 'published'
       WHERE u.status = 'active'
       GROUP BY u.id
       ORDER BY published_comments DESC, u.created_at ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      username: string;
      display_name: string;
      avatar: string | null;
      created_at: number;
      published_comments: number;
    }>();
  return (result.results ?? []).map((row) => ({
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    publishedComments: row.published_comments,
    joinedAt: row.created_at,
  }));
}

export type RecentCommentRow = {
  id: string;
  articleSlug: string;
  authorType: 'member' | 'guest';
  authorName: string;
  content: string;
  createdAt: number;
};

export async function listRecentArticleComments(
  limit = 8,
): Promise<RecentCommentRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, article_slug, author_type, author_name, content, created_at
       FROM article_comments
       WHERE status = 'published'
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      article_slug: string;
      author_type: string;
      author_name: string;
      content: string;
      created_at: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    articleSlug: row.article_slug,
    authorType: row.author_type === 'member' ? 'member' : 'guest',
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export type MomentRow = { id: string; content: string; createdAt: number };

export async function listMoments(limit = 50): Promise<MomentRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, content, created_at FROM moments
       WHERE status = 'published'
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{ id: string; content: string; created_at: number }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function createMoment(content: string): Promise<void> {
  const id = randomToken();
  await db()
    .prepare(
      `INSERT INTO moments (id, content, status, created_at)
       VALUES (?, ?, 'published', ?)`,
    )
    .bind(id, content, Date.now())
    .run();
}

export async function deleteMoment(id: string): Promise<void> {
  await db().prepare(`DELETE FROM moments WHERE id = ?`).bind(id).run();
}

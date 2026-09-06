import { sha256 } from '@/lib/security';
import {
  listFriendFeeds,
  upsertFriendPosts,
  type FriendFeed,
} from '@/lib/community-store';

export type ParsedPost = { title: string; link: string; publishedAt: number };
export type FeedRefreshResult = {
  friendId: string;
  name: string;
  ok: boolean;
  count: number;
};

const PER_FEED_LIMIT = 5;
const FETCH_TIMEOUT_MS = 12_000;

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function pick(tag: string, block: string) {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  );
  return match ? decodeEntities(match[1]) : '';
}

// 宽松的 RSS2/Atom 解析：只取标题、链接、发布时间，够朋友圈展示用。
export function parseFeed(xml: string): ParsedPost[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];
  const posts: ParsedPost[] = [];
  for (const block of blocks) {
    const title = pick('title', block);
    const rssLink = pick('link', block);
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '';
    const link = (rssLink || atomLink).trim();
    if (!title || !link) continue;
    const dateText =
      pick('pubDate', block) ||
      pick('published', block) ||
      pick('updated', block) ||
      pick('dc:date', block);
    const parsed = dateText ? Date.parse(dateText) : Number.NaN;
    posts.push({
      title,
      link,
      publishedAt: Number.isFinite(parsed) ? parsed : Date.now(),
    });
  }
  return posts
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, PER_FEED_LIMIT);
}

async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      // 部分站点 WAF 会拦非常规 UA，用类浏览器 UA 提高抓取成功率
      'user-agent':
        'Mozilla/5.0 (compatible; StarryNotesFriendCircle/1.0; +RSS reader)',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// 抓取所有配置了 RSS 的友链，把最新文章去重写库。
export async function refreshFriendCircle(): Promise<{
  results: FeedRefreshResult[];
  inserted: number;
}> {
  const feeds: FriendFeed[] = await listFriendFeeds();
  const results: FeedRefreshResult[] = [];
  let inserted = 0;
  for (const feed of feeds) {
    try {
      const xml = await fetchFeed(feed.rssUrl);
      const posts = parseFeed(xml);
      const rows = await Promise.all(
        posts.map(async (post) => ({
          id: (await sha256(post.link)).slice(0, 32),
          friendId: feed.id,
          title: post.title,
          link: post.link,
          publishedAt: post.publishedAt,
        })),
      );
      inserted += await upsertFriendPosts(rows);
      results.push({ friendId: feed.id, name: feed.name, ok: true, count: rows.length });
    } catch {
      results.push({ friendId: feed.id, name: feed.name, ok: false, count: 0 });
    }
  }
  return { results, inserted };
}

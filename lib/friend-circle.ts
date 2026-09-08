import { sha256 } from '@/lib/security';
import {
  normalizeSafeExternalUrl,
  parseFeed,
  type ParsedFeedPost,
} from '@/lib/feed-security';
import {
  listFriendFeeds,
  upsertFriendPosts,
  type FriendFeed,
} from '@/lib/community-store';

export type ParsedPost = ParsedFeedPost;
export type FeedRefreshResult = {
  friendId: string;
  name: string;
  ok: boolean;
  count: number;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FEED_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const ALLOWED_CONTENT_TYPE = /(?:rss|atom|xml)|text\/plain/i;

async function readBoundedBody(response: Response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
    throw new Error('Feed exceeds size limit');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FEED_BYTES) {
      await reader.cancel();
      throw new Error('Feed exceeds size limit');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchFeed(url: string): Promise<string> {
  const initialUrl = normalizeSafeExternalUrl(url);
  if (!initialUrl) throw new Error('Unsafe feed URL');
  let currentUrl: string = initialUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response: Response = await fetch(currentUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; StarryNotesFriendCircle/1.0; +RSS reader)',
        accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (response.status >= 300 && response.status < 400) {
      const location: string | null = response.headers.get('location');
      const redirected: string | null = location
        ? normalizeSafeExternalUrl(location, currentUrl)
        : null;
      if (!redirected || redirects === MAX_REDIRECTS) {
        throw new Error('Unsafe or excessive feed redirect');
      }
      currentUrl = redirected;
      continue;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type');
    if (contentType && !ALLOWED_CONTENT_TYPE.test(contentType)) {
      throw new Error('Unsupported feed content type');
    }
    return readBoundedBody(response);
  }
  throw new Error('Feed redirect limit exceeded');
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
      const posts = parseFeed(xml, feed.rssUrl);
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
      results.push({
        friendId: feed.id,
        name: feed.name,
        ok: true,
        count: rows.length,
      });
    } catch {
      results.push({ friendId: feed.id, name: feed.name, ok: false, count: 0 });
    }
  }
  return { results, inserted };
}

import { describe, expect, it } from 'vitest';
import { normalizeSafeExternalUrl, parseFeed } from '@/lib/feed-security';

describe('friend feed URL policy', () => {
  it('accepts public HTTP(S) URLs and resolves relative post links', () => {
    expect(normalizeSafeExternalUrl('https://blog.example.org/feed.xml')).toBe(
      'https://blog.example.org/feed.xml',
    );
    const posts = parseFeed(
      '<rss><item><title>新文章</title><link>/posts/1</link><pubDate>2026-09-01</pubDate></item></rss>',
      'https://blog.example.org/feed.xml',
    );
    expect(posts[0]?.link).toBe('https://blog.example.org/posts/1');
  });

  it.each([
    'http://localhost/feed',
    'http://127.0.0.1/feed',
    'http://10.0.0.1/feed',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/feed',
    'http://[::ffff:127.0.0.1]/feed',
    'http://[2001:db8::1]/feed',
    'http://service.internal/feed',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:password@example.org/feed',
  ])('rejects unsafe URL %s', (url) => {
    expect(normalizeSafeExternalUrl(url)).toBeNull();
  });

  it('drops unsafe links embedded in an otherwise valid feed', () => {
    const xml = `
      <rss>
        <item><title>脚本</title><link>javascript:alert(1)</link></item>
        <item><title>内网</title><link>http://192.168.1.1/post</link></item>
      </rss>`;
    expect(parseFeed(xml, 'https://blog.example.org/feed.xml')).toEqual([]);
  });
});

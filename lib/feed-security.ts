export type ParsedFeedPost = {
  title: string;
  link: string;
  publishedAt: number;
};

const PER_FEED_LIMIT = 5;

function parseIpv4(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const numbers = parts.map(Number);
  return numbers.every(
    (part) => Number.isInteger(part) && part >= 0 && part <= 255,
  )
    ? numbers
    : null;
}

function isBlockedIpv4(parts: number[]) {
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedHostname(rawHostname: string) {
  const hostname = rawHostname.replace(/^\[|\]$/g, '').toLowerCase();
  const ipv4 = parseIpv4(hostname);
  if (ipv4) return isBlockedIpv4(ipv4);

  if (hostname.includes(':')) {
    // 直接 IPv6 字面量存在多种压缩与 IPv4-mapped 表示，全部拒绝以避免绕过。
    // 正常的公网 IPv6 站点仍可通过其 DNS 主机名访问。
    return true;
  }

  return (
    !hostname.includes('.') ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa')
  );
}

export function normalizeSafeExternalUrl(value: string, base?: string) {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password || isBlockedHostname(url.hostname)) {
      return null;
    }
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

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

// 宽松解析 RSS2/Atom，但只保留可安全外链的 HTTP(S) 地址。
export function parseFeed(xml: string, feedUrl: string): ParsedFeedPost[] {
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];
  const posts: ParsedFeedPost[] = [];
  for (const block of blocks) {
    const title = pick('title', block);
    const rssLink = pick('link', block);
    const atomLink = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? '';
    const link = normalizeSafeExternalUrl(
      decodeEntities(rssLink || atomLink),
      feedUrl,
    );
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

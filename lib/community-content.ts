import { randomToken } from '@/lib/security';
import { cleanCommunityText } from '@/lib/community-auth';

export type CommunityContentStatus = 'published' | 'pending';

const CONTENT_MAX = 1000;
const NAME_MAX = 20;
const LINK_NAME_MAX = 40;
const LINK_URL_MAX = 300;
const LINK_DESC_MAX = 200;

export type ContentItem = {
  id: string;
  authorType: 'member' | 'guest';
  authorName: string;
  content: string;
  status: CommunityContentStatus;
  createdAt: number;
  articleSlug?: string;
  parentId?: string | null;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateCommentContent(content: unknown) {
  const text = cleanCommunityText(content, CONTENT_MAX);
  if (text.length < 2) return { ok: false as const, error: '内容太短了（至少 2 个字符）' };
  return { ok: true as const, value: text };
}

export function validateGuestName(name: unknown) {
  const text = cleanCommunityText(name, NAME_MAX);
  if (text.length < 1) return { ok: false as const, error: '请填写昵称' };
  return { ok: true as const, value: text };
}

export function validateLinkInput(input: {
  name?: unknown;
  url?: unknown;
  description?: unknown;
}) {
  const name = cleanCommunityText(input.name, LINK_NAME_MAX);
  const rawUrl = cleanCommunityText(input.url, LINK_URL_MAX);
  const description = cleanCommunityText(input.description, LINK_DESC_MAX);
  if (name.length < 1) return { ok: false as const, error: '请填写站点名称' };
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false as const, error: '站点地址不是有效链接' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false as const, error: '站点地址只支持 http/https' };
  }
  return {
    ok: true as const,
    value: { name, url: parsed.toString(), description },
  };
}

export function nowId() {
  return randomToken();
}

export function statusForAuthor(authorType: 'member' | 'guest'): CommunityContentStatus {
  return authorType === 'member' ? 'published' : 'pending';
}

import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import { cleanCommunityText, getCommunitySessionUser } from '@/lib/community-auth';
import { articles } from '@/lib/content';
import {
  commentBelongsToSlug,
  createArticleComment,
  listArticleComments,
} from '@/lib/community-store';

const COMMENT_LIMIT = 8;
const COMMENT_WINDOW_MS = 10 * 60_000;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!articles.some((article) => article.slug === slug)) {
    return NextResponse.json({ comments: [] }, { status: 404 });
  }
  const comments = await listArticleComments(slug);
  return NextResponse.json(
    { comments },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const slug = typeof input.slug === 'string' ? input.slug : '';
  if (!articles.some((article) => article.slug === slug)) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const key = await clientKey();
  if (
    !(await consumeRateLimit(
      'community-comment',
      key,
      COMMENT_LIMIT,
      COMMENT_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: '发言太频繁，稍后再试试' },
      { status: 429 },
    );
  }

  const member = await getCommunitySessionUser();
  const authorType = member ? 'member' : 'guest';
  const authorName = cleanCommunityText(input.guestName, 20);
  const content = cleanCommunityText(input.content, 1000);
  if (content.length < 2) {
    return NextResponse.json({ error: '评论至少 2 个字符' }, { status: 400 });
  }
  if (authorType === 'guest' && authorName.length < 1) {
    return NextResponse.json({ error: '请填写昵称' }, { status: 400 });
  }

  const parentIdRaw = typeof input.parentId === 'string' ? input.parentId : '';
  let parentId: string | null = null;
  if (parentIdRaw) {
    if (!(await commentBelongsToSlug(parentIdRaw, slug))) {
      return NextResponse.json({ error: '回复的评论不存在' }, { status: 400 });
    }
    parentId = parentIdRaw;
  }

  const status = member ? 'published' : 'pending';
  await createArticleComment({
    slug,
    parentId,
    authorType,
    authorUserId: member?.id ?? null,
    authorName: member ? member.displayName : authorName,
    content,
    status,
  });

  return NextResponse.json({
    status,
    message:
      status === 'published' ? '评论已发布' : '评论已提交，等待博主审核后显示',
  });
}

import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import { cleanCommunityText, getCommunitySessionUser } from '@/lib/community-auth';
import { createSiteMessage, listSiteMessages } from '@/lib/community-store';

const MESSAGE_LIMIT = 5;
const MESSAGE_WINDOW_MS = 10 * 60_000;

export async function GET() {
  const messages = await listSiteMessages();
  return NextResponse.json(
    { messages },
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

  const key = await clientKey();
  if (
    !(await consumeRateLimit(
      'community-message',
      key,
      MESSAGE_LIMIT,
      MESSAGE_WINDOW_MS,
    ))
  ) {
    return NextResponse.json({ error: '留言太频繁，稍后再试试' }, { status: 429 });
  }

  const member = await getCommunitySessionUser();
  const guestName = cleanCommunityText(input.guestName, 20);
  const content = cleanCommunityText(input.content, 1000);
  if (content.length < 2) {
    return NextResponse.json({ error: '留言至少 2 个字符' }, { status: 400 });
  }
  if (!member && guestName.length < 1) {
    return NextResponse.json({ error: '请填写昵称' }, { status: 400 });
  }

  const status = member ? 'published' : 'pending';
  await createSiteMessage({
    authorType: member ? 'member' : 'guest',
    authorUserId: member?.id ?? null,
    authorName: member ? member.displayName : guestName,
    content,
    status,
  });

  return NextResponse.json({
    status,
    message:
      status === 'published' ? '留言已发布' : '留言已提交，等待博主审核后显示',
  });
}

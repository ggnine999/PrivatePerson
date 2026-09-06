import { NextResponse } from 'next/server';
import { cleanCommunityText } from '@/lib/community-auth';
import {
  createMoment,
  deleteMoment,
  listMoments,
} from '@/lib/community-store';
import { getSession, requireApiSession } from '@/lib/server-auth';

// 说说：公开时间线 + 站主发布/删除（复用保险库的站主会话）。
export async function GET() {
  const [moments, session] = await Promise.all([listMoments(50), getSession()]);
  return NextResponse.json(
    {
      moments,
      canPublish: Boolean(session),
      csrfToken: session?.csrf_token ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const session = await requireApiSession(request, true);
  if (!session) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const content =
    typeof input.content === 'string' ? cleanCommunityText(input.content, 1000) : '';
  if (content.length < 2) {
    return NextResponse.json({ error: '说说至少 2 个字' }, { status: 400 });
  }
  await createMoment(content);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requireApiSession(request, true);
  if (!session) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const id = typeof (body as { id?: unknown } | null)?.id === 'string'
    ? (body as { id: string }).id
    : '';
  if (!id) {
    return NextResponse.json({ error: '缺少条目标识' }, { status: 400 });
  }
  await deleteMoment(id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { listFriendPosts } from '@/lib/community-store';
import { refreshFriendCircle } from '@/lib/friend-circle';
import { getSession, requireApiSession, runtime } from '@/lib/server-auth';

// 友链朋友圈：GET 公开聚合；POST 刷新（站主会话，或配置了
// FRIEND_CIRCLE_SECRET 的外部定时任务带 x-refresh-secret 头触发）。
export async function GET() {
  const [posts, session] = await Promise.all([listFriendPosts(30), getSession()]);
  return NextResponse.json(
    {
      posts,
      canRefresh: Boolean(session),
      csrfToken: session?.csrf_token ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const secret = runtime('FRIEND_CIRCLE_SECRET') ?? '';
  const provided = request.headers.get('x-refresh-secret') ?? '';
  if (!secret || provided !== secret) {
    const session = await requireApiSession(request, true);
    if (!session) {
      return NextResponse.json(
        { error: '需要站主身份或刷新密钥' },
        { status: 401 },
      );
    }
  }
  const summary = await refreshFriendCircle();
  const posts = await listFriendPosts(30);
  return NextResponse.json({ summary, posts });
}

import { NextResponse } from 'next/server';
import {
  cleanCommunityText,
  countPublishedCommentsByUser,
  getCommunitySessionUser,
  requireCommunityUser,
  updateCommunityProfile,
} from '@/lib/community-auth';

const AVATAR_MAX_CHARS = 140_000; // 约 100KB 的 data URL

export async function GET() {
  const user = await getCommunitySessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const published = await countPublishedCommentsByUser(user.id);
  return NextResponse.json({
    user: {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      level: Math.min(9, 1 + Math.floor(published / 5)),
      publishedComments: published,
    },
    csrfToken: user.csrfToken,
  });
}

export async function PATCH(request: Request) {
  const user = await requireCommunityUser(request, true);
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const patch: { displayName?: string; bio?: string; avatar?: string | null } =
    {};

  if (input.displayName !== undefined) {
    const displayName = cleanCommunityText(input.displayName, 20);
    if (displayName.length < 1) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }
    patch.displayName = displayName;
  }
  if (input.bio !== undefined) {
    patch.bio = cleanCommunityText(input.bio, 200);
  }
  if (input.avatar !== undefined) {
    const avatar = typeof input.avatar === 'string' ? input.avatar : '';
    if (avatar === '') {
      patch.avatar = null;
    } else if (
      /^data:image\/(png|jpeg|webp);base64,/.test(avatar) &&
      avatar.length <= AVATAR_MAX_CHARS
    ) {
      patch.avatar = avatar;
    } else {
      return NextResponse.json(
        { error: '头像需要 100KB 以内的 PNG/JPG/WebP 图片' },
        { status: 400 },
      );
    }
  }

  await updateCommunityProfile(user.id, patch);
  const updated = await getCommunitySessionUser();
  return NextResponse.json({
    user: updated
      ? { displayName: updated.displayName, avatar: updated.avatar, bio: updated.bio }
      : null,
  });
}

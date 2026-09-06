import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server-auth';
import { articlePatchSchema } from '@/lib/content-schemas';
import { articleSlugExists, updateArticle, deleteArticle } from '@/lib/site-content';
import { countWords } from '@/lib/word-count';

// 站主文章管理：PUT 编辑 / DELETE 硬删除
const minutesFor = (content: string) =>
  Math.max(1, Math.round(countWords(content) / 400));

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireApiSession(request, true))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = articlePatchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: '文章字段无效' }, { status: 400 });
  }
  const patch = parsed.data;
  if (patch.slug !== undefined && (await articleSlugExists(patch.slug, id))) {
    return NextResponse.json({ error: 'slug 已被占用' }, { status: 409 });
  }
  const fullPatch = {
    ...patch,
    ...(patch.content !== undefined
      ? { readingMinutes: minutesFor(patch.content) }
      : {}),
  };
  const updated = await updateArticle(id, fullPatch);
  if (!updated) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireApiSession(request, true))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await deleteArticle(id);
  if (!deleted) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

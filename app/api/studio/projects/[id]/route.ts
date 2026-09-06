import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server-auth';
import { projectPatchSchema } from '@/lib/content-schemas';
import {
  deleteProject,
  projectSlugExists,
  updateProject,
} from '@/lib/site-content';

// 站主项目管理：PUT 编辑 / DELETE 硬删除
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
  const parsed = projectPatchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: '项目字段无效' }, { status: 400 });
  }
  const patch = parsed.data;
  if (patch.slug !== undefined && (await projectSlugExists(patch.slug, id))) {
    return NextResponse.json({ error: 'slug 已被占用' }, { status: 409 });
  }
  const updated = await updateProject(id, patch);
  if (!updated) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
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
  const deleted = await deleteProject(id);
  if (!deleted) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

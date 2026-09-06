import { NextResponse } from 'next/server';
import { randomToken } from '@/lib/security';
import { requireApiSession } from '@/lib/server-auth';
import { projectInputSchema } from '@/lib/content-schemas';
import {
  createProject,
  listAllProjects,
  projectSlugExists,
} from '@/lib/site-content';

// 站主项目管理：GET 全量列表 / POST 新建
export async function GET(request: Request) {
  if (!(await requireApiSession(request))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  return NextResponse.json(
    { projects: await listAllProjects() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!(await requireApiSession(request, true))) {
    return NextResponse.json({ error: '需要站主身份' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = projectInputSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: '项目字段无效' }, { status: 400 });
  }
  const input = parsed.data;
  if (await projectSlugExists(input.slug)) {
    return NextResponse.json({ error: 'slug 已被占用' }, { status: 409 });
  }
  const id = randomToken();
  await createProject({
    id,
    slug: input.slug,
    name: input.name,
    description: input.description,
    category: input.category,
    tech: input.tech,
    status: input.status,
    website: input.website,
    repository: input.repository ?? null,
    featured: input.featured,
    mark: input.mark,
  });
  return NextResponse.json({ ok: true, id });
}

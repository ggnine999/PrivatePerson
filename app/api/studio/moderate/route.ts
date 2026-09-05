import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server-auth';
import { approveContent, deleteContent } from '@/lib/community-store';

const TYPES = new Set(['comment', 'message', 'link']);
const ACTIONS = new Set(['approve', 'delete']);

export async function POST(request: Request) {
  const session = await requireApiSession(request, true);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const type = typeof input.type === 'string' ? input.type : '';
  const id = typeof input.id === 'string' ? input.id : '';
  const action = typeof input.action === 'string' ? input.action : '';

  if (!TYPES.has(type) || !ACTIONS.has(action) || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  if (action === 'approve') {
    await approveContent(type as 'comment' | 'message' | 'link', id);
  } else {
    await deleteContent(type as 'comment' | 'message' | 'link', id);
  }
  return NextResponse.json({ ok: true });
}

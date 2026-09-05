import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/server-auth';
import {
  listPendingComments,
  listPendingLinks,
  listPendingMessages,
} from '@/lib/community-store';

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const [comments, messages, links] = await Promise.all([
    listPendingComments(),
    listPendingMessages(),
    listPendingLinks(),
  ]);
  return NextResponse.json(
    { comments, messages, links },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

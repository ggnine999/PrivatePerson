import { NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import { validateLinkInput } from '@/lib/community-content';
import { createFriendLinkSubmission, listFriendLinks } from '@/lib/community-store';

const LINK_LIMIT = 3;
const LINK_WINDOW_MS = 60 * 60_000;

export async function GET() {
  const links = await listFriendLinks();
  return NextResponse.json(
    { links },
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
    !(await consumeRateLimit('community-link', key, LINK_LIMIT, LINK_WINDOW_MS))
  ) {
    return NextResponse.json(
      { error: '提交太频繁，请一小时后再试' },
      { status: 429 },
    );
  }

  const validated = validateLinkInput({
    name: input.name,
    url: input.url,
    description: input.description,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  await createFriendLinkSubmission(validated.value);
  return NextResponse.json({
    message: '申请已提交，博主审核通过后会展示在这里',
  });
}

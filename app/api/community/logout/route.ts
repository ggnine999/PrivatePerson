import { NextResponse } from 'next/server';
import { destroyCommunitySession } from '@/lib/community-auth';
import { destroySession } from '@/lib/server-auth';

export async function POST() {
  await destroySession();
  await destroyCommunitySession();
  return NextResponse.json({ ok: true });
}

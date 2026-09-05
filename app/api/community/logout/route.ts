import { NextResponse } from 'next/server';
import { destroyCommunitySession } from '@/lib/community-auth';

export async function POST() {
  await destroyCommunitySession();
  return NextResponse.json({ ok: true });
}

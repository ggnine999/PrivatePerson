import { NextResponse } from 'next/server';
import { listReaders } from '@/lib/community-store';

// 读者墙：按已发布评论数排序的社区成员（含头像）。
export async function GET() {
  const readers = await listReaders(60);
  return NextResponse.json(
    { readers },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

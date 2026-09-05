import { NextResponse } from 'next/server';
import { sanitizeNeteaseLyrics } from '@/lib/netease';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';

const UPSTREAM_TIMEOUT_MS = 5000;
const LYRIC_LIMIT = 60;
const LYRIC_WINDOW_MS = 60_000;
const PUBLIC_CACHE = 'public, max-age=3600, s-maxage=3600';
const NETEASE_HEADERS = {
  Referer: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0',
};

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^\d{1,20}$/.test(id)) {
    return NextResponse.json(
      { lyrics: [], error: 'invalid-song-id' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const key = await clientKey();
    if (
      !(await consumeRateLimit(
        'netease-lyric',
        key,
        LYRIC_LIMIT,
        LYRIC_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { lyrics: [], error: 'rate-limited' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        },
      );
    }

    const response = await fetch(
      `https://music.163.com/api/song/lyric?id=${encodeURIComponent(id)}&lv=1&kv=1&tv=-1`,
      {
        headers: NETEASE_HEADERS,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error(`lyric upstream ${response.status}`);

    return NextResponse.json(
      { lyrics: sanitizeNeteaseLyrics(await response.json()) },
      { headers: { 'Cache-Control': PUBLIC_CACHE } },
    );
  } catch {
    return NextResponse.json(
      { lyrics: [], error: 'lyric-unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

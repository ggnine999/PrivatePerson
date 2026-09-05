import { NextResponse } from 'next/server';
import { sanitizeNeteasePlaybackUrl } from '@/lib/netease';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';

const UPSTREAM_TIMEOUT_MS = 5000;
const PLAYBACK_LIMIT = 60;
const PLAYBACK_WINDOW_MS = 60_000;
const NETEASE_HEADERS = {
  Referer: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0',
};

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^\d{1,20}$/.test(id)) {
    return NextResponse.json(
      { url: null, error: 'invalid-song-id' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const key = await clientKey();
    if (
      !(await consumeRateLimit(
        'netease-playback',
        key,
        PLAYBACK_LIMIT,
        PLAYBACK_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { url: null, error: 'rate-limited' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        },
      );
    }

    const ids = JSON.stringify([Number(id)]);
    const response = await fetch(
      `https://music.163.com/api/song/enhance/player/url?ids=${encodeURIComponent(ids)}&br=128000`,
      {
        headers: NETEASE_HEADERS,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error(`playback upstream ${response.status}`);

    const url = sanitizeNeteasePlaybackUrl(id, await response.json());
    if (!url) {
      return NextResponse.json(
        { url: null, error: 'playback-unavailable' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { url },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { url: null, error: 'playback-unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

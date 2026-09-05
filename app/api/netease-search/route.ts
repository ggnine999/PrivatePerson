import { NextResponse } from 'next/server';
import {
  applyNeteasePlaybackAvailability,
  sanitizeNeteaseSongs,
} from '@/lib/netease';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';

const UPSTREAM_TIMEOUT_MS = 5000;
const MAX_KEYWORD_LENGTH = 40;
const SEARCH_LIMIT = 30;
const SEARCH_WINDOW_MS = 60_000;
const PUBLIC_CACHE = 'public, max-age=300, s-maxage=300';
const NETEASE_HEADERS = {
  Referer: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0',
};

export async function GET(request: Request) {
  const keyword = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
    return NextResponse.json(
      { songs: [] },
      { headers: { 'Cache-Control': PUBLIC_CACHE } },
    );
  }

  try {
    const key = await clientKey();
    if (
      !(await consumeRateLimit(
        'netease-search',
        key,
        SEARCH_LIMIT,
        SEARCH_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { songs: [], error: 'rate-limited' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '60',
          },
        },
      );
    }

    const searchResponse = await fetch(
      `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&limit=12`,
      {
        headers: NETEASE_HEADERS,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (!searchResponse.ok)
      throw new Error(`search upstream ${searchResponse.status}`);

    const candidates = sanitizeNeteaseSongs(await searchResponse.json());
    if (candidates.length === 0) {
      return NextResponse.json(
        { songs: [] },
        { headers: { 'Cache-Control': PUBLIC_CACHE } },
      );
    }

    const ids = JSON.stringify(candidates.map((song) => Number(song.id)));
    const playbackResponse = await fetch(
      `https://music.163.com/api/song/enhance/player/url?ids=${encodeURIComponent(ids)}&br=128000`,
      {
        headers: NETEASE_HEADERS,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (!playbackResponse.ok)
      throw new Error(`playback upstream ${playbackResponse.status}`);

    const songs = applyNeteasePlaybackAvailability(
      candidates,
      await playbackResponse.json(),
    );
    return NextResponse.json(
      { songs },
      { headers: { 'Cache-Control': PUBLIC_CACHE } },
    );
  } catch {
    return NextResponse.json(
      { songs: [], error: 'search-unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

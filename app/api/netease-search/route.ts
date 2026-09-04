import { NextResponse } from 'next/server';

// 只读代理网易云网页版的公开搜索接口，供首页播放器搜索流媒体歌曲。
// 音频播放始终通过网易云官方外链 iframe 完成，这里不接触任何音频流。
const UPSTREAM_TIMEOUT_MS = 5000;
const MAX_KEYWORD_LENGTH = 40;

export async function GET(request: Request) {
  const keyword = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (!keyword || keyword.length > MAX_KEYWORD_LENGTH) {
    return NextResponse.json({ songs: [] });
  }
  try {
    const upstream = await fetch(
      `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&limit=12`,
      {
        headers: { Referer: 'https://music.163.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      },
    );
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const data = (await upstream.json()) as {
      result?: {
        songs?: Array<{
          id: number;
          name: string;
          artists?: Array<{ name: string }>;
          album?: { name?: string };
          duration?: number;
          fee?: number;
        }>;
      };
    };
    const songs = (data.result?.songs ?? []).map((song) => ({
      id: String(song.id),
      name: song.name,
      artist: (song.artists ?? []).map((artist) => artist.name).join('/'),
      album: song.album?.name ?? '',
      durationMs: song.duration ?? 0,
      vip: song.fee === 8,
    }));
    return NextResponse.json(
      { songs },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    );
  } catch {
    return NextResponse.json(
      { songs: [], error: 'search-unavailable' },
      { status: 502 },
    );
  }
}

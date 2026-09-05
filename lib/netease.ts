export type NeteaseSong = {
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  vip: boolean;
  playable: boolean;
};

export type NeteaseLyricLine = {
  time: number;
  text: string;
};

const MAX_LYRIC_SOURCE_LENGTH = 100_000;
const MAX_LYRIC_LINES = 400;
const MAX_LYRIC_TEXT_LENGTH = 300;
const NETEASE_MEDIA_DOMAIN = 'music.126.net';
const NETEASE_SONG_ID_PATTERN = /^\d{1,20}$/;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export function sanitizeNeteaseSongs(value: unknown): NeteaseSong[] {
  const root = object(value);
  const result = object(root?.result);
  const songs = Array.isArray(result?.songs) ? result.songs : [];

  return songs
    .flatMap((candidate) => {
      const song = object(candidate);
      const songId =
        typeof song?.id === 'number' || typeof song?.id === 'string'
          ? String(song.id)
          : '';
      if (
        !song ||
        !NETEASE_SONG_ID_PATTERN.test(songId) ||
        typeof song.name !== 'string'
      )
        return [];

      const artists = Array.isArray(song.artists)
        ? song.artists
            .map(object)
            .flatMap((artist) =>
              artist && typeof artist.name === 'string' ? [artist.name] : [],
            )
        : [];
      const album = object(song.album);

      return [
        {
          id: songId,
          name: song.name.slice(0, 160),
          artist: artists.join('/').slice(0, 240),
          album:
            album && typeof album.name === 'string'
              ? album.name.slice(0, 160)
              : '',
          durationMs:
            typeof song.duration === 'number' &&
            Number.isFinite(song.duration) &&
            song.duration >= 0
              ? Math.floor(song.duration)
              : 0,
          vip: song.fee === 8,
          playable: false,
        },
      ];
    })
    .slice(0, 12);
}

export function getNeteaseSongUrl(songId: string) {
  if (!NETEASE_SONG_ID_PATTERN.test(songId)) return null;
  const url = new URL('https://music.163.com/song');
  url.searchParams.set('id', songId);
  return url.toString();
}

export function sanitizeNeteasePlaybackUrl(songId: string, value: unknown) {
  const root = object(value);
  const data = Array.isArray(root?.data) ? root.data : [];
  const match = data.map(object).find((item) => {
    return (
      item?.code === 200 &&
      (typeof item.id === 'number' || typeof item.id === 'string') &&
      String(item.id) === songId &&
      typeof item.url === 'string'
    );
  });
  if (!match || typeof match.url !== 'string') return null;

  try {
    const url = new URL(match.url);
    const allowedHost =
      url.hostname === NETEASE_MEDIA_DOMAIN ||
      url.hostname.endsWith(`.${NETEASE_MEDIA_DOMAIN}`);
    if (
      !allowedHost ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    url.protocol = 'https:';
    url.port = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function applyNeteasePlaybackAvailability(
  songs: NeteaseSong[],
  value: unknown,
) {
  return songs.map((song) => ({
    ...song,
    playable: sanitizeNeteasePlaybackUrl(song.id, value) !== null,
  }));
}

export function sanitizeNeteaseLyrics(value: unknown): NeteaseLyricLine[] {
  const root = object(value);
  const lrc = object(root?.lrc);
  if (typeof lrc?.lyric !== 'string') return [];

  const parsed = lrc.lyric
    .slice(0, MAX_LYRIC_SOURCE_LENGTH)
    .split(/\r?\n/)
    .flatMap((sourceLine) => {
      const timestamps = Array.from(
        sourceLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g),
      );
      const text = sourceLine
        .replace(/\[[^\]]+\]/g, '')
        .trim()
        .slice(0, MAX_LYRIC_TEXT_LENGTH);
      if (!text || timestamps.length === 0) return [];

      return timestamps.flatMap((match) => {
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        const fraction = Number((match[3] ?? '').padEnd(3, '0').slice(0, 3));
        if (
          !Number.isFinite(minutes) ||
          !Number.isFinite(seconds) ||
          !Number.isFinite(fraction) ||
          seconds >= 60
        )
          return [];
        return [{ time: minutes * 60 + seconds + fraction / 1000, text }];
      });
    })
    .sort((left, right) => left.time - right.time);

  const seen = new Set<string>();
  return parsed
    .filter((line) => {
      const key = `${line.time}:${line.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_LYRIC_LINES);
}
export function findActiveNeteaseLyricIndex(
  lines: NeteaseLyricLine[],
  currentTime: number,
) {
  if (!Number.isFinite(currentTime) || currentTime < 0) return -1;
  let activeIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (currentTime < lines[index].time) break;
    activeIndex = index;
  }
  return activeIndex;
}

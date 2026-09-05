import { describe, expect, it } from 'vitest';
import { getDailyRecommendationQuery, getWrappedQueueIndex } from '@/lib/music';
import {
  applyNeteasePlaybackAvailability,
  findActiveNeteaseLyricIndex,
  getNeteaseSongUrl,
  sanitizeNeteaseLyrics,
  sanitizeNeteasePlaybackUrl,
  sanitizeNeteaseSongs,
} from '@/lib/netease';

describe('NetEase search response sanitization', () => {
  it('accepts only the public fields used by the player', () => {
    const songs = sanitizeNeteaseSongs({
      result: {
        songs: [
          {
            id: 42,
            name: '虚构歌曲',
            artists: [{ name: '虚构歌手' }, { ignored: 'value' }],
            album: { name: '虚构专辑', privateField: 'discarded' },
            duration: 123456.9,
            fee: 8,
            token: 'must-not-pass-through',
          },
        ],
      },
    });

    expect(songs).toEqual([
      {
        id: '42',
        name: '虚构歌曲',
        artist: '虚构歌手',
        album: '虚构专辑',
        durationMs: 123456,
        vip: true,
        playable: false,
      },
    ]);
    expect(JSON.stringify(songs)).not.toContain('must-not-pass-through');
  });

  it('rejects malformed entries and caps results at twelve', () => {
    const valid = Array.from({ length: 20 }, (_, index) => ({
      id: index,
      name: `song-${index}`,
    }));
    const songs = sanitizeNeteaseSongs({
      result: {
        songs: [
          { name: 'missing id' },
          { id: 'javascript:alert(1)', name: 'unsafe id' },
          null,
          ...valid,
        ],
      },
    });
    expect(songs).toHaveLength(12);
    expect(sanitizeNeteaseSongs({ result: { songs: 'invalid' } })).toEqual([]);
  });

  it('marks only songs with an anonymous playback URL as playable', () => {
    const songs = sanitizeNeteaseSongs({
      result: {
        songs: [
          { id: 316100, name: 'unavailable' },
          { id: 5235487, name: 'available' },
        ],
      },
    });

    expect(
      applyNeteasePlaybackAvailability(songs, {
        data: [
          { id: 316100, url: null, code: -110 },
          {
            id: 5235487,
            url: 'http://m801.music.126.net/track.mp3',
            code: 200,
            secret: 'discarded',
          },
          { id: 'bad', url: 'javascript:alert(1)', code: 200 },
        ],
      }).map(({ id, playable }) => ({ id, playable })),
    ).toEqual([
      { id: '316100', playable: false },
      { id: '5235487', playable: true },
    ]);
  });
});

describe('NetEase song links', () => {
  it('creates only canonical HTTPS links for numeric song ids', () => {
    expect(getNeteaseSongUrl('316100')).toBe(
      'https://music.163.com/song?id=316100',
    );
    expect(getNeteaseSongUrl('javascript:alert(1)')).toBeNull();
    expect(getNeteaseSongUrl('42&foo=bar')).toBeNull();
    expect(getNeteaseSongUrl('')).toBeNull();
  });
});

describe('NetEase playback URL sanitization', () => {
  it('accepts only the matching NetEase CDN URL and upgrades it to HTTPS', () => {
    expect(
      sanitizeNeteasePlaybackUrl('42', {
        data: [
          {
            id: 42,
            code: 200,
            url: 'http://m801.music.126.net/track.mp3?token=test#ignored',
          },
        ],
      }),
    ).toBe('https://m801.music.126.net/track.mp3?token=test');
  });

  it('rejects mismatched ids, credentials, unsafe schemes and other hosts', () => {
    expect(
      sanitizeNeteasePlaybackUrl('42', {
        data: [{ id: 41, code: 200, url: 'https://m801.music.126.net/a.mp3' }],
      }),
    ).toBeNull();
    expect(
      sanitizeNeteasePlaybackUrl('42', {
        data: [
          {
            id: 42,
            code: 200,
            url: 'https://user:pass@m801.music.126.net/a.mp3',
          },
        ],
      }),
    ).toBeNull();
    expect(
      sanitizeNeteasePlaybackUrl('42', {
        data: [{ id: 42, code: 200, url: 'javascript:alert(1)' }],
      }),
    ).toBeNull();
    expect(
      sanitizeNeteasePlaybackUrl('42', {
        data: [{ id: 42, code: 200, url: 'https://music.example.test/a.mp3' }],
      }),
    ).toBeNull();
  });
});

describe('NetEase lyric response sanitization', () => {
  it('parses, sorts and deduplicates timestamped lyric lines', () => {
    expect(
      sanitizeNeteaseLyrics({
        lrc: {
          lyric:
            '[ar:虚构歌手]\n[01:02.5][00:05.250]同一句\n[00:03.00]第一句\n[00:03.00]第一句',
        },
      }),
    ).toEqual([
      { time: 3, text: '第一句' },
      { time: 5.25, text: '同一句' },
      { time: 62.5, text: '同一句' },
    ]);
  });

  it('finds the active lyric line for automatic scrolling', () => {
    const lines = [
      { time: 3, text: '第一句' },
      { time: 8.5, text: '第二句' },
      { time: 15, text: '第三句' },
    ];
    expect(findActiveNeteaseLyricIndex(lines, 0)).toBe(-1);
    expect(findActiveNeteaseLyricIndex(lines, 3)).toBe(0);
    expect(findActiveNeteaseLyricIndex(lines, 12)).toBe(1);
    expect(findActiveNeteaseLyricIndex(lines, 99)).toBe(2);
    expect(findActiveNeteaseLyricIndex(lines, Number.NaN)).toBe(-1);
  });

  it('rejects malformed lyric payloads and untimed metadata', () => {
    expect(
      sanitizeNeteaseLyrics({ lrc: { lyric: '[ar:歌手]\n无时间歌词' } }),
    ).toEqual([]);
    expect(sanitizeNeteaseLyrics({ lrc: { lyric: 123 } })).toEqual([]);
    expect(sanitizeNeteaseLyrics(null)).toEqual([]);
  });
});

describe('Music queue rotation', () => {
  it('wraps forward and backward through the queue', () => {
    expect(getWrappedQueueIndex(3, 0)).toBe(1);
    expect(getWrappedQueueIndex(3, 2)).toBe(0);
    expect(getWrappedQueueIndex(3, 0, -1)).toBe(2);
    expect(getWrappedQueueIndex(1, 0)).toBe(0);
    expect(getWrappedQueueIndex(0, 0)).toBe(-1);
  });

  it('selects one deterministic public recommendation query per China day', () => {
    const morning = new Date('2026-09-05T00:15:00+08:00');
    const evening = new Date('2026-09-05T23:45:00+08:00');
    expect(getDailyRecommendationQuery(morning)).toBe(
      getDailyRecommendationQuery(evening),
    );
  });
});

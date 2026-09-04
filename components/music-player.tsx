'use client';

import {
  ListMusic,
  Music2,
  Pause,
  Play,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import mascotManifest from '@/lib/mascots.generated.json';
import { tracks } from '@/lib/music';

const INITIAL_VOLUME = 0.65;

// 贴纸自动布局：按文件名排序，左右两列交替，列内自上而下均分；
// 中间唱片区与歌词中线保持留空，每张贴纸带伪随机倾斜与尺寸变化。
function mascotSlotStyle(file: string, index: number, total: number): CSSProperties {
  const side: 'left' | 'right' = index % 2 === 0 ? 'left' : 'right';
  const inSide = Math.floor(index / 2);
  const sideCount = Math.floor((total - (side === 'left' ? 1 : 2)) / 2) + 1;
  const startTop = 8;
  const step = sideCount > 1 ? (72 - startTop) / (sideCount - 1) : 22;
  const top = sideCount > 1 ? startTop + inSide * step : 30;
  const xOffsets = [0.6, 1.15, 0.85];
  const width = 2.5 + ((index * 7) % 3) * 0.25;
  const tilt = ((index * 47) % 11) - 5;
  return {
    [side]: `${xOffsets[inSide % xOffsets.length]}rem`,
    top: `${top}%`,
    width: `${width}rem`,
    backgroundImage: `url('/images/mascots/${file}')`,
    '--tilt': `${tilt}deg`,
  } as CSSProperties;
}

type NeteaseSong = {
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  vip: boolean;
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lyricsLockedUntilRef = useRef(0);
  const autoplayAfterSwitchRef = useRef(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [query, setQuery] = useState('');
  const [neteaseSong, setNeteaseSong] = useState<NeteaseSong | null>(null);
  const [neteaseSearch, setNeteaseSearch] = useState<{
    keyword: string;
    state: 'idle' | 'loading' | 'error';
    results: NeteaseSong[];
  }>({ keyword: '', state: 'idle', results: [] });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(INITIAL_VOLUME);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const track = tracks[trackIndex];
  const lyrics = track.lyrics ?? [];
  let activeLyric = 0;
  for (let index = 0; index < lyrics.length; index += 1) {
    if (currentTime >= lyrics[index].time) activeLyric = index;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTracks = tracks
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        normalizedQuery === '' ||
        `${item.title} ${item.artist}`.toLowerCase().includes(normalizedQuery),
    );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const pause = () => setPlaying(false);
    const play = () => setPlaying(true);
    const recover = () => setError('');

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('pause', pause);
    audio.addEventListener('play', play);
    audio.addEventListener('canplay', recover);
    audio.addEventListener('playing', recover);

    // audio 元素随曲目 src 变化由 key 重建：重置进度状态、按需补读时长，并在换曲后续播。
    // 本地小文件的 loadedmetadata 可能在监听器挂载前就已触发，不补读一次进度条会停在 max=0。
    setCurrentTime(0);
    setDuration(0);
    setError('');
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      updateDuration();
    }
    audio.volume = INITIAL_VOLUME;
    if (autoplayAfterSwitchRef.current) {
      autoplayAfterSwitchRef.current = false;
      audio.play().catch(() => setError('浏览器暂时无法播放这首音轨，请稍后重试。'));
    }

    return () => {
      // 清理引用的是旧曲目元素，必须暂停，否则换曲后旧歌会继续在后台播放
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('pause', pause);
      audio.removeEventListener('play', play);
      audio.removeEventListener('canplay', recover);
      audio.removeEventListener('playing', recover);
    };
  }, [track.src]);

  useEffect(() => {
    const container = lyricsRef.current;
    const line = lyricLineRefs.current[activeLyric];
    if (!container || !line) return;
    // 用户正在浏览歌词时暂停自动滚动，闲置 5 秒后恢复
    if (Date.now() < lyricsLockedUntilRef.current) return;
    const containerBox = container.getBoundingClientRect();
    const lineBox = line.getBoundingClientRect();
    const target =
      container.scrollTop +
      (lineBox.top + lineBox.height / 2 - (containerBox.top + containerBox.height / 2));
    container.scrollTo({ top: Math.max(0, target) });
  }, [activeLyric]);

  useEffect(() => {
    const container = lyricsRef.current;
    if (!container) return;
    const lock = () => {
      lyricsLockedUntilRef.current = Date.now() + 5000;
    };
    container.addEventListener('wheel', lock, { passive: true });
    container.addEventListener('pointerdown', lock);
    container.addEventListener('touchstart', lock, { passive: true });
    return () => {
      container.removeEventListener('wheel', lock);
      container.removeEventListener('pointerdown', lock);
      container.removeEventListener('touchstart', lock);
    };
  }, []);

  // 搜索网易云（防抖）；音频播放始终走官方外链 iframe，这里只做只读元数据搜索。
  // setState 全部位于异步回调中；结果只在关键词与当前输入一致时渲染，防止迟到的旧响应串台。
  useEffect(() => {
    if (!showPlaylist) return;
    const keyword = query.trim();
    if (!keyword) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setNeteaseSearch({ keyword, state: 'loading', results: [] });
      fetch(`/api/netease-search?q=${encodeURIComponent(keyword)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error('search failed');
          return response.json() as Promise<{ songs?: NeteaseSong[] }>;
        })
        .then((data) => {
          setNeteaseSearch({ keyword, state: 'idle', results: data.songs ?? [] });
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') {
            setNeteaseSearch({ keyword, state: 'error', results: [] });
          }
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, showPlaylist]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setError('');
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setError('浏览器暂时无法播放这首音轨，请稍后重试。');
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  function changeVolume(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = value;
    audio.muted = false;
    setVolume(value);
    setMuted(false);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  function selectTrack(index: number) {
    setNeteaseSong(null);
    setShowPlaylist(false);
    setQuery('');
    if (index === trackIndex) return;
    autoplayAfterSwitchRef.current = true;
    setTrackIndex(index);
  }

  function selectNetease(song: NeteaseSong) {
    // 保持列表打开，方便连续试听；选本地曲目即可切回自制播放器
    setNeteaseSong(song);
  }

  function togglePlaylist() {
    setQuery('');
    setShowPlaylist((open) => !open);
  }

  const keyword = query.trim();
  const neteaseMatches = neteaseSearch.keyword === keyword;
  const headingTitle = neteaseSong ? neteaseSong.name : track.title;
  const headingArtist = neteaseSong ? neteaseSong.artist : track.artist;
  const statusText = neteaseSong
    ? '网易云音乐'
    : playing
      ? '正在播放'
      : '晴空电台';

  return (
    <aside className="music-player" aria-label="首页音乐播放器">
      {/* 歌词面板已在 DOM 中提供全部文本；字幕轨道会形成第二份需要同步的歌词来源 */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        key={track.src}
        ref={audioRef}
        src={track.src}
        preload="metadata"
        loop
        onError={() => setError('音轨加载失败，请稍后重试。')}
      />
      <div className="music-player-heading">
        <span
          className={playing && !neteaseSong ? 'music-disc playing' : 'music-disc'}
          aria-hidden="true"
        >
          <Music2 />
        </span>
        <div>
          <span className="music-status">{statusText}</span>
          <strong>{headingTitle}</strong>
          <small>{headingArtist}</small>
        </div>
        <button
          className="music-list-toggle"
          type="button"
          onClick={togglePlaylist}
          aria-expanded={showPlaylist}
          aria-label={showPlaylist ? '关闭歌曲列表' : '查看歌曲列表'}
        >
          {showPlaylist ? <X /> : <ListMusic />}
        </button>
      </div>
      {/* 站点主视觉人物作为卡片内装饰，纯装饰性元素对读屏器隐藏 */}
      <div className="music-mascot" aria-hidden="true" />
      {mascotManifest.mascots.map((mascot, index) => (
        <span
          key={mascot.file}
          className="music-mascot-char"
          style={mascotSlotStyle(mascot.file, index, mascotManifest.mascots.length)}
          aria-hidden="true"
        />
      ))}
      {!neteaseSong && (
        <div className="music-controls">
          <button
            className="music-play"
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? '暂停音乐' : '播放音乐'}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <div className="music-progress">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="音乐播放进度"
              aria-valuetext={`${formatTime(currentTime)} / 共 ${formatTime(duration)}`}
            />
            <div className="music-time" aria-live="off">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="music-volume">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? '取消静音' : '静音'}
            >
              {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="音乐音量"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      )}
      {(showPlaylist || neteaseSong) && (
        <>
          {neteaseSong && (
            <iframe
              className="music-netease"
              key={neteaseSong.id}
              src={`https://music.163.com/outchain/player?type=2&id=${neteaseSong.id}&auto=1&height=66`}
              width="100%"
              height={86}
              loading="lazy"
              allow="autoplay"
              title={`网易云音乐外链播放器：${neteaseSong.name}`}
            />
          )}
          {showPlaylist && (
            <div className="music-playlist">
              <label className="music-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索本地曲库或网易云音乐"
                  aria-label="搜索歌曲"
                />
              </label>
              <ul className="music-track-list">
                {filteredTracks.length > 0 && (
                  <li className="music-group-label" aria-hidden="true">
                    本地曲库
                  </li>
                )}
                {filteredTracks.map(({ item, index }) => {
                  const isCurrent = !neteaseSong && index === trackIndex;
                  return (
                    <li key={item.src}>
                      <button
                        className={isCurrent ? 'music-track current' : 'music-track'}
                        type="button"
                        onClick={() => selectTrack(index)}
                        aria-current={isCurrent ? 'true' : undefined}
                      >
                        <span className="music-track-meta">
                          <span className="music-track-title">{item.title}</span>
                          <span className="music-track-artist">{item.artist}</span>
                        </span>
                        {isCurrent && (
                          <Music2 className="music-track-playing" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
                {keyword !== '' && (
                  <li className="music-group-label" aria-hidden="true">
                    网易云音乐
                  </li>
                )}
                {keyword !== '' && neteaseMatches && neteaseSearch.state === 'loading' && (
                  <li className="music-track-empty">正在搜索网易云音乐…</li>
                )}
                {keyword !== '' && neteaseMatches && neteaseSearch.state === 'error' && (
                  <li className="music-track-empty">
                    网易云搜索暂时失败，请稍后重试。
                  </li>
                )}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'idle' &&
                  neteaseSearch.results.map((song) => {
                    const isCurrent = neteaseSong?.id === song.id;
                    return (
                      <li key={`netease-${song.id}`}>
                        <button
                          className={
                            isCurrent ? 'music-track current' : 'music-track'
                          }
                          type="button"
                          onClick={() => selectNetease(song)}
                          aria-current={isCurrent ? 'true' : undefined}
                        >
                          <span className="music-track-meta">
                            <span className="music-track-title">{song.name}</span>
                            <span className="music-track-artist">
                              {song.artist}
                              {song.album ? ` · ${song.album}` : ''}
                            </span>
                          </span>
                          {song.vip && (
                            <span className="music-track-vip" aria-label="VIP 歌曲">
                              VIP
                            </span>
                          )}
                          {isCurrent && (
                            <Music2
                              className="music-track-playing"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'idle' &&
                  neteaseSearch.results.length === 0 &&
                  filteredTracks.length === 0 && (
                    <li className="music-track-empty">没有找到匹配的歌曲</li>
                  )}
              </ul>
            </div>
          )}
        </>
      )}
      {!neteaseSong && !showPlaylist && lyrics.length > 0 && (
        <div className="music-lyrics" ref={lyricsRef}>
          {lyrics.map((line, index) => (
            <p
              key={`${line.time}-${index}`}
              ref={(node) => {
                lyricLineRefs.current[index] = node;
              }}
              className={index === activeLyric ? 'music-lyric active' : 'music-lyric'}
            >
              {line.text}
            </p>
          ))}
        </div>
      )}
      {!neteaseSong && error && (
        <output className="music-error" aria-live="polite">
          {error}
        </output>
      )}
    </aside>
  );
}

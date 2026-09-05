'use client';

import {
  ExternalLink,
  ListMusic,
  Plus,
  Music2,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import mascotManifest from '@/lib/mascots.generated.json';
import { findActiveNeteaseLyricIndex, getNeteaseSongUrl } from '@/lib/netease';
import {
  getDailyRecommendationQuery,
  getWrappedQueueIndex,
  tracks,
} from '@/lib/music';

const INITIAL_VOLUME = 0.65;

// 逐字歌词按字形（grapheme）拆分，避免 emoji 等复合字符被拆坏
const graphemeSegmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });

// 贴纸安全槽位：位置经过验证，避开控制条高度带（约 20%-31%）与右上角列表按钮；
// 每列最多 3 张、共 6 张，超出的图片不渲染。网易云模式下面板为全宽，
// 仅保留标题两侧（top 5%）的槽位，其余自动让位。
const MASCOT_SLOTS = [
  { side: 'left', top: '5%', x: '0.6rem' },
  { side: 'right', top: '5%', x: '3.2rem' },
  { side: 'left', top: '38%', x: '0.6rem' },
  { side: 'right', top: '38%', x: '0.6rem' },
  { side: 'left', top: '64%', x: '1rem' },
  { side: 'right', top: '64%', x: '0.6rem' },
] as const;

// 贴纸自动布局：按文件名排序依次入座安全槽位，带伪随机倾斜与尺寸变化。
function mascotSlotStyle(slotIndex: number, file: string): CSSProperties {
  const slot = MASCOT_SLOTS[slotIndex % MASCOT_SLOTS.length];
  const width = 2.5 + ((slotIndex * 7) % 3) * 0.25;
  const tilt = ((slotIndex * 47) % 11) - 5;
  return {
    [slot.side]: slot.x,
    top: slot.top,
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
  playable: boolean;
};

type NeteaseLyricLine = {
  time: number;
  text: string;
};

type QueueItem =
  | { key: string; source: 'local'; trackIndex: number }
  | { key: string; source: 'netease'; song: NeteaseSong };

function localQueueItem(trackIndex: number): QueueItem {
  return { key: `local:${trackIndex}`, source: 'local', trackIndex };
}

function neteaseQueueItem(song: NeteaseSong): QueueItem {
  return { key: `netease:${song.id}`, source: 'netease', song };
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MusicPlayer() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isPrivateRoute = pathname.startsWith('/vault');
  const [homeTarget, setHomeTarget] = useState<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lyricsLockedUntilRef = useRef(0);
  const autoplayAfterSwitchRef = useRef(false);
  const neteaseLyricRequestRef = useRef(0);
  const neteasePlaybackRequestRef = useRef(0);
  const neteaseLyricsRef = useRef<HTMLDivElement>(null);
  const neteaseLyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const queueInitializedRef = useRef(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentQueueKey, setCurrentQueueKey] = useState('');
  const [queueStatus, setQueueStatus] = useState<
    'loading' | 'ready' | 'fallback'
  >('loading');
  const [queueMessage, setQueueMessage] = useState('正在加载今日推荐…');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [query, setQuery] = useState('');
  const [neteaseSearch, setNeteaseSearch] = useState<{
    keyword: string;
    state: 'idle' | 'loading' | 'error';
    results: NeteaseSong[];
  }>({ keyword: '', state: 'idle', results: [] });
  const [neteaseLyrics, setNeteaseLyrics] = useState<{
    songId: string;
    state: 'idle' | 'loading' | 'error';
    lines: NeteaseLyricLine[];
  }>({ songId: '', state: 'idle', lines: [] });
  const [neteasePlayback, setNeteasePlayback] = useState<{
    songId: string;
    state: 'idle' | 'loading' | 'error';
    url: string;
  }>({ songId: '', state: 'idle', url: '' });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(INITIAL_VOLUME);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const currentQueueItem =
    queue.find((item) => item.key === currentQueueKey) ?? queue[0] ?? null;
  const trackIndex =
    currentQueueItem?.source === 'local' ? currentQueueItem.trackIndex : 0;
  const track = tracks[trackIndex];
  const neteaseSong =
    currentQueueItem?.source === 'netease' ? currentQueueItem.song : null;
  const lyrics =
    currentQueueItem?.source === 'local' ? (track.lyrics ?? []) : [];
  const audioSource = !currentQueueItem
    ? ''
    : neteaseSong
      ? neteasePlayback.songId === neteaseSong.id &&
        neteasePlayback.state === 'idle'
        ? neteasePlayback.url
        : ''
      : track.src;
  let activeLyric = 0;
  for (let index = 0; index < lyrics.length; index += 1) {
    if (currentTime >= lyrics[index].time) activeLyric = index;
  }
  const activeNeteaseLyric = findActiveNeteaseLyricIndex(
    neteaseLyrics.lines,
    currentTime,
  );
  useEffect(() => {
    queueMicrotask(() => {
      setHomeTarget(isHome ? document.getElementById('home-music-slot') : null);
    });
  }, [isHome]);

  useEffect(() => {
    if (!isPrivateRoute) return;
    audioRef.current?.pause();
  }, [isPrivateRoute]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSource) return;

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
      audio
        .play()
        .catch(() => setError('浏览器阻止了自动播放，点击播放即可开始收听。'));
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
  }, [audioSource]);

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
      (lineBox.top +
        lineBox.height / 2 -
        (containerBox.top + containerBox.height / 2));
    container.scrollTo({ top: Math.max(0, target) });
  }, [activeLyric]);

  useEffect(() => {
    if (showPlaylist) return;
    const container = neteaseLyricsRef.current;
    const line = neteaseLyricLineRefs.current[activeNeteaseLyric];
    if (!container || !line || activeNeteaseLyric < 0) return;
    const containerBox = container.getBoundingClientRect();
    const lineBox = line.getBoundingClientRect();
    const target =
      container.scrollTop +
      (lineBox.top +
        lineBox.height / 2 -
        (containerBox.top + containerBox.height / 2));
    container.scrollTo({ top: Math.max(0, target) });
  }, [activeNeteaseLyric, showPlaylist]);

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

  // 搜索网易云（防抖）；结果选中后再获取短期音频地址与歌词，避免在搜索响应中暴露或缓存媒体 URL。
  // setState 全部位于异步回调中；结果只在关键词与当前输入一致时渲染，防止迟到的旧响应串台。
  useEffect(() => {
    if (!showPlaylist) return;
    const keyword = query.trim();
    if (!keyword) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setNeteaseSearch({ keyword, state: 'loading', results: [] });
      fetch(`/api/netease-search?q=${encodeURIComponent(keyword)}&v=2`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error('search failed');
          return response.json() as Promise<{ songs?: NeteaseSong[] }>;
        })
        .then((data) => {
          setNeteaseSearch({
            keyword,
            state: 'idle',
            results: data.songs ?? [],
          });
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

  // 初始队列为空时，从网易云公开曲库按中国日期轮换“今日推荐”关键词。
  // 浏览器可能阻止无手势自动播放；此时保留队列并提示用户点击播放。
  // 私人保险库不初始化公开音乐服务，避免跨越其严格 CSP 与数据边界。
  useEffect(() => {
    if (isPrivateRoute) return;
    const controller = new AbortController();
    const recommendationQuery = getDailyRecommendationQuery();
    fetch(
      `/api/netease-search?q=${encodeURIComponent(recommendationQuery)}&v=3`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error('recommendations failed');
        return response.json() as Promise<{ songs?: NeteaseSong[] }>;
      })
      .then((data) => {
        if (queueInitializedRef.current) return;
        const recommendations = (data.songs ?? [])
          .filter((song) => song.playable)
          .slice(0, 5)
          .map(neteaseQueueItem);
        if (recommendations.length === 0) {
          throw new Error('no playable recommendations');
        }
        queueInitializedRef.current = true;
        setQueue(recommendations);
        setQueueStatus('ready');
        setQueueMessage(`已加载 ${recommendations.length} 首今日推荐`);
        autoplayAfterSwitchRef.current = true;
        setCurrentQueueKey(recommendations[0].key);
      })
      .catch((requestError: Error) => {
        if (requestError.name === 'AbortError' || queueInitializedRef.current)
          return;
        const fallback = localQueueItem(0);
        queueInitializedRef.current = true;
        setQueue([fallback]);
        setQueueStatus('fallback');
        setQueueMessage('今日推荐暂不可用，已切换到本地曲目');
        autoplayAfterSwitchRef.current = true;
        setCurrentQueueKey(fallback.key);
      });
    return () => controller.abort();
  }, [isPrivateRoute]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !audioSource) return;
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

  useEffect(() => {
    const queueItem = currentQueueItem;
    if (!queueItem) return;

    neteaseLyricRequestRef.current += 1;
    neteasePlaybackRequestRef.current += 1;
    const lyricRequestId = neteaseLyricRequestRef.current;
    const playbackRequestId = neteasePlaybackRequestRef.current;
    const audio = audioRef.current;
    if (audio) audio.pause();
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError('');
      if (queueItem.source === 'local') {
        setNeteasePlayback({ songId: '', state: 'idle', url: '' });
        setNeteaseLyrics({ songId: '', state: 'idle', lines: [] });
      } else {
        setNeteaseLyrics({
          songId: queueItem.song.id,
          state: 'loading',
          lines: [],
        });
        setNeteasePlayback({
          songId: queueItem.song.id,
          state: 'loading',
          url: '',
        });
      }
    });

    if (queueItem.source === 'local') {
      return () => {
        disposed = true;
      };
    }

    const songId = queueItem.song.id;
    const lyricController = new AbortController();
    const playbackController = new AbortController();

    fetch(`/api/netease-lyric?id=${encodeURIComponent(songId)}`, {
      signal: lyricController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('lyric request failed');
        return response.json() as Promise<{ lyrics?: NeteaseLyricLine[] }>;
      })
      .then((data) => {
        if (lyricRequestId !== neteaseLyricRequestRef.current) return;
        setNeteaseLyrics({
          songId,
          state: 'idle',
          lines: Array.isArray(data.lyrics) ? data.lyrics : [],
        });
      })
      .catch((requestError: Error) => {
        if (
          requestError.name !== 'AbortError' &&
          lyricRequestId === neteaseLyricRequestRef.current
        ) {
          setNeteaseLyrics({ songId, state: 'error', lines: [] });
        }
      });

    fetch(`/api/netease-playback?id=${encodeURIComponent(songId)}`, {
      signal: playbackController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('playback request failed');
        return response.json() as Promise<{ url?: string }>;
      })
      .then((data) => {
        if (
          playbackRequestId !== neteasePlaybackRequestRef.current ||
          typeof data.url !== 'string' ||
          data.url === ''
        )
          return;
        setNeteasePlayback({ songId, state: 'idle', url: data.url });
      })
      .catch((requestError: Error) => {
        if (
          requestError.name !== 'AbortError' &&
          playbackRequestId === neteasePlaybackRequestRef.current
        ) {
          setNeteasePlayback({ songId, state: 'error', url: '' });
          setError('');
        }
      });

    return () => {
      disposed = true;
      lyricController.abort();
      playbackController.abort();
    };
  }, [currentQueueItem]);
  function activateQueueItem(
    item: QueueItem,
    options: {
      autoplay?: boolean;
      closeList?: boolean;
      clearSearch?: boolean;
    } = {},
  ) {
    const { autoplay = true, closeList = true, clearSearch = true } = options;
    const sameItem = item.key === currentQueueItem?.key;
    const audio = audioRef.current;
    if (sameItem && audioSource) {
      if (closeList) setShowPlaylist(false);
      if (clearSearch) setQuery('');
      if (autoplay && audio?.paused) {
        void audio
          .play()
          .catch(() =>
            setError('浏览器阻止了自动播放，点击播放即可开始收听。'),
          );
      }
      return;
    }

    neteaseLyricRequestRef.current += 1;
    neteasePlaybackRequestRef.current += 1;
    if (audio) audio.pause();
    setPlaying(false);
    setCurrentQueueKey(item.key);
    setCurrentTime(0);
    setDuration(0);
    setError('');
    if (closeList) setShowPlaylist(false);
    if (clearSearch) setQuery('');

    autoplayAfterSwitchRef.current = autoplay;
  }

  function addNeteaseToQueue(song: NeteaseSong) {
    if (!song.playable) return;
    const item = neteaseQueueItem(song);
    const wasEmpty = queue.length === 0;
    queueInitializedRef.current = true;
    setQueue((current) =>
      current.some((candidate) => candidate.key === item.key)
        ? current
        : [...current, item],
    );
    setQueueStatus('ready');
    setQueueMessage(`《${song.name}》已加入队列`);
    if (wasEmpty) {
      autoplayAfterSwitchRef.current = true;
      setCurrentQueueKey(item.key);
    }
  }

  function addLocalToQueue(index: number) {
    const item = localQueueItem(index);
    const wasEmpty = queue.length === 0;
    queueInitializedRef.current = true;
    setQueue((current) =>
      current.some((candidate) => candidate.key === item.key)
        ? current
        : [...current, item],
    );
    setQueueStatus('ready');
    setQueueMessage(`《${tracks[index].title}》已加入队列`);
    if (wasEmpty) {
      autoplayAfterSwitchRef.current = true;
      setCurrentQueueKey(item.key);
    }
  }

  function removeQueueItem(item: QueueItem) {
    const itemIndex = queue.findIndex(
      (candidate) => candidate.key === item.key,
    );
    if (itemIndex < 0) return;
    const remaining = queue.filter((candidate) => candidate.key !== item.key);
    const removingCurrent = item.key === currentQueueItem?.key;
    const shouldContinue = playing;
    queueInitializedRef.current = true;
    setQueue(remaining);
    setQueueStatus('ready');
    setQueueMessage(remaining.length === 0 ? '队列已清空' : '已从队列移除');
    if (!removingCurrent) return;

    if (remaining.length === 0) {
      audioRef.current?.pause();
      neteaseLyricRequestRef.current += 1;
      neteasePlaybackRequestRef.current += 1;
      setCurrentQueueKey('');
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setNeteasePlayback({ songId: '', state: 'idle', url: '' });
      setNeteaseLyrics({ songId: '', state: 'idle', lines: [] });
      setError('');
      return;
    }

    const replacement = remaining[Math.min(itemIndex, remaining.length - 1)];
    activateQueueItem(replacement, {
      autoplay: shouldContinue,
      closeList: false,
      clearSearch: false,
    });
  }

  function playQueueOffset(step: number) {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(
      (item) => item.key === currentQueueItem?.key,
    );
    const nextIndex = getWrappedQueueIndex(queue.length, currentIndex, step);
    const nextItem = queue[nextIndex];
    if (nextItem) activateQueueItem(nextItem, { autoplay: true });
  }

  function togglePlaylist() {
    setQuery('');
    setShowPlaylist((open) => !open);
  }

  const keyword = query.trim();
  const neteaseMatches = neteaseSearch.keyword === keyword;
  const headingTitle = !currentQueueItem
    ? '听歌队列'
    : neteaseSong
      ? neteaseSong.name
      : track.title;
  const headingArtist = !currentQueueItem
    ? queueStatus === 'loading'
      ? '正在装入今日推荐'
      : '搜索并加入喜欢的音乐'
    : neteaseSong
      ? neteaseSong.artist
      : track.artist;
  const statusText = !currentQueueItem
    ? '队列为空'
    : neteaseSong
      ? '网易云音乐'
      : playing
        ? '正在播放'
        : '晴空电台';

  const fullPlayer = (
    <aside className="music-player" aria-label="首页音乐播放器">
      <div className="music-player-heading">
        <span
          className={playing ? 'music-disc playing' : 'music-disc'}
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
      {/* 站点主视觉人物作为卡片内装饰，纯装饰性元素对读屏器隐藏。
          网易云模式下面板全宽，仅保留标题两侧槽位，其余贴纸自动让位 */}
      <div className="music-mascot" aria-hidden="true" />
      {mascotManifest.mascots
        .slice(0, MASCOT_SLOTS.length)
        .map((mascot, index) => {
          const slot = MASCOT_SLOTS[index];
          const style = mascotSlotStyle(index, mascot.file);
          const yieldToPanel =
            (showPlaylist || Boolean(neteaseSong)) && slot.top !== '5%';
          return (
            <span
              key={mascot.file}
              className="music-mascot-char"
              style={{
                ...style,
                display: yieldToPanel ? 'none' : style.display,
              }}
              aria-hidden="true"
            />
          );
        })}
      {currentQueueItem &&
        (!neteaseSong ||
          (neteasePlayback.songId === neteaseSong.id &&
            neteasePlayback.state === 'idle')) && (
          <div className="music-controls">
            <div className="music-transport">
              <button
                className="music-skip"
                type="button"
                onClick={() => playQueueOffset(-1)}
                disabled={queue.length < 2}
                aria-label="上一首"
              >
                <SkipBack />
              </button>
              <button
                className="music-play"
                type="button"
                onClick={togglePlayback}
                aria-label={playing ? '暂停音乐' : '播放音乐'}
              >
                {playing ? <Pause /> : <Play />}
              </button>
              <button
                className="music-skip"
                type="button"
                onClick={() => playQueueOffset(1)}
                disabled={queue.length < 2}
                aria-label="下一首"
              >
                <SkipForward />
              </button>
            </div>
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
      {neteaseSong && neteasePlayback.state === 'loading' && (
        <output className="music-playback-status">正在准备音频…</output>
      )}
      {neteaseSong && neteasePlayback.state === 'error' && (
        <output className="music-playback-fallback">
          <strong>当前网页无法播放这首歌</strong>
          <span>可能受到版权、会员或地区限制，请前往网易云音乐继续收听。</span>
          {getNeteaseSongUrl(neteaseSong.id) && (
            <a
              href={getNeteaseSongUrl(neteaseSong.id) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              在网易云音乐中打开
              <ExternalLink aria-hidden="true" />
            </a>
          )}
        </output>
      )}
      {(showPlaylist || neteaseSong) && (
        <>
          {neteaseSong &&
            !showPlaylist &&
            neteasePlayback.state !== 'error' && (
              <section
                className="music-netease-lyrics-panel"
                aria-label={`${neteaseSong.name} 歌词`}
              >
                <div className="music-netease-lyrics-heading">
                  <strong>歌词</strong>
                  <span>与播放进度同步</span>
                </div>
                <div
                  className="music-lyrics music-netease-lyrics-scroll"
                  ref={neteaseLyricsRef}
                >
                  {(neteaseLyrics.songId !== neteaseSong.id ||
                    neteaseLyrics.state === 'loading') && (
                    <output className="music-lyric-empty">正在加载歌词…</output>
                  )}
                  {neteaseLyrics.songId === neteaseSong.id &&
                    neteaseLyrics.state === 'error' && (
                      <output className="music-lyric-empty">
                        歌词暂时无法加载，请稍后重试。
                      </output>
                    )}
                  {neteaseLyrics.songId === neteaseSong.id &&
                    neteaseLyrics.state === 'idle' &&
                    neteaseLyrics.lines.length === 0 && (
                      <output className="music-lyric-empty">
                        这首歌暂无可用歌词。
                      </output>
                    )}
                  {neteaseLyrics.songId === neteaseSong.id &&
                    neteaseLyrics.state === 'idle' &&
                    neteaseLyrics.lines.length > 0 && (
                      <div className="music-lyrics-track music-netease-lyrics-track">
                        {neteaseLyrics.lines.map((line, index) => (
                          <p
                            className={
                              index === activeNeteaseLyric
                                ? 'music-lyric active'
                                : 'music-lyric'
                            }
                            key={`${line.time}-${index}`}
                            ref={(node) => {
                              neteaseLyricLineRefs.current[index] = node;
                            }}
                          >
                            {line.text}
                          </p>
                        ))}
                      </div>
                    )}
                </div>
              </section>
            )}
          {showPlaylist && (
            <div className="music-playlist">
              <label className="music-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索网易云音乐并加入队列"
                  aria-label="搜索歌曲"
                />
              </label>
              <ul className="music-track-list">
                {keyword !== '' && (
                  <li className="music-group-label" aria-hidden="true">
                    网易云搜索结果
                  </li>
                )}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'loading' && (
                    <li className="music-track-empty">正在搜索网易云音乐…</li>
                  )}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'error' && (
                    <li className="music-track-empty">
                      网易云搜索暂时失败，请稍后重试。
                    </li>
                  )}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'idle' &&
                  neteaseSearch.results.map((song) => {
                    const songUrl = getNeteaseSongUrl(song.id);
                    const itemKey = `netease:${song.id}`;
                    const isQueued = queue.some((item) => item.key === itemKey);
                    return (
                      <li key={itemKey}>
                        <div
                          className={
                            song.playable
                              ? 'music-track music-track-row'
                              : 'music-track music-track-row unavailable'
                          }
                        >
                          <span className="music-track-meta">
                            <span className="music-track-title">
                              {song.name}
                            </span>
                            <span className="music-track-artist">
                              {song.artist}
                              {song.album ? ` · ${song.album}` : ''}
                            </span>
                          </span>
                          {!song.playable ? (
                            <span
                              className="music-track-unavailable"
                              aria-label="受到版权、会员或地区限制"
                            >
                              版权限制
                            </span>
                          ) : (
                            song.vip && (
                              <span
                                className="music-track-vip"
                                aria-label="VIP 歌曲"
                              >
                                VIP
                              </span>
                            )
                          )}
                          <button
                            className="music-queue-add"
                            type="button"
                            onClick={() => addNeteaseToQueue(song)}
                            disabled={!song.playable || isQueued}
                            aria-label={
                              !song.playable
                                ? `${song.name} 当前网页不可播放`
                                : isQueued
                                  ? `${song.name} 已在队列中`
                                  : `将 ${song.name} 加入队列`
                            }
                          >
                            {isQueued ? '已加入' : <Plus aria-hidden="true" />}
                          </button>
                          {songUrl && (
                            <a
                              className="music-track-open"
                              href={songUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`在网易云音乐中打开 ${song.name}`}
                            >
                              <span>打开</span>
                              <ExternalLink aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                {keyword !== '' &&
                  neteaseMatches &&
                  neteaseSearch.state === 'idle' &&
                  neteaseSearch.results.length === 0 && (
                    <li className="music-track-empty">没有找到匹配的歌曲</li>
                  )}
                <li className="music-queue-status">
                  <output aria-live="polite">{queueMessage}</output>
                  {queue.length > 0 && (
                    <span>
                      {queue.length === 1
                        ? '单曲循环'
                        : `${queue.length} 首循环`}
                    </span>
                  )}
                </li>
                <li className="music-group-label" aria-hidden="true">
                  听歌队列
                </li>
                {queue.length === 0 && queueStatus !== 'loading' && (
                  <li className="music-track-empty">
                    队列为空，可从本地曲目或搜索结果中加入歌曲。
                  </li>
                )}
                {queue.map((queueItem) => {
                  const isLocal = queueItem.source === 'local';
                  const localTrack = isLocal
                    ? tracks[queueItem.trackIndex]
                    : null;
                  const title = isLocal
                    ? localTrack?.title
                    : queueItem.song.name;
                  const artist = isLocal
                    ? localTrack?.artist
                    : queueItem.song.artist;
                  const isCurrent = queueItem.key === currentQueueItem?.key;
                  return (
                    <li key={queueItem.key}>
                      <div
                        className={
                          isCurrent
                            ? 'music-track music-track-row current'
                            : 'music-track music-track-row'
                        }
                      >
                        <button
                          className="music-track-select"
                          type="button"
                          onClick={() => activateQueueItem(queueItem)}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-label={`播放 ${title}`}
                        >
                          <span className="music-track-meta">
                            <span className="music-track-title">{title}</span>
                            <span className="music-track-artist">{artist}</span>
                          </span>
                        </button>
                        <span className="music-queue-source">
                          {isLocal ? '本地' : '网易云'}
                        </span>
                        {isCurrent && (
                          <Music2
                            className="music-track-playing"
                            aria-hidden="true"
                          />
                        )}
                        <button
                          className="music-queue-remove"
                          type="button"
                          onClick={() => removeQueueItem(queueItem)}
                          aria-label={`从队列移除 ${title}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                <li className="music-group-label" aria-hidden="true">
                  本地曲目
                </li>
                {tracks.map((localTrack, index) => {
                  const itemKey = `local:${index}`;
                  const isQueued = queue.some((item) => item.key === itemKey);
                  return (
                    <li key={localTrack.src}>
                      <div className="music-track music-track-row">
                        <span className="music-track-meta">
                          <span className="music-track-title">
                            {localTrack.title}
                          </span>
                          <span className="music-track-artist">
                            {localTrack.artist}
                          </span>
                        </span>
                        <button
                          className="music-queue-add"
                          type="button"
                          onClick={() => addLocalToQueue(index)}
                          disabled={isQueued}
                          aria-label={
                            isQueued
                              ? `${localTrack.title} 已在队列中`
                              : `将 ${localTrack.title} 加入队列`
                          }
                        >
                          {isQueued ? '已加入' : <Plus aria-hidden="true" />}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
      {!neteaseSong && !showPlaylist && lyrics.length > 0 && (
        <div className="music-lyrics" ref={lyricsRef}>
          {/* 轨道层：上下大留白制造滚动余量，让「高亮行走到面板中部后钉住居中、
              其余歌词从下往上滚过」的效果成立 */}
          <div className="music-lyrics-track">
            {lyrics.map((line, index) => {
              const isActive = index === activeLyric;
              // 逐字跟唱：当前句内按时间进度线性推进，唱过的字保持蓝色
              const chars = Array.from(
                graphemeSegmenter.segment(line.text),
                (segment) => segment.segment,
              );
              let sungChars = 0;
              if (isActive) {
                const lineStart = line.time;
                const lineEnd =
                  index < lyrics.length - 1
                    ? lyrics[index + 1].time
                    : duration || lineStart + 8;
                const progress = Math.min(
                  1,
                  Math.max(
                    0,
                    (currentTime - lineStart) /
                      Math.max(lineEnd - lineStart, 0.001),
                  ),
                );
                sungChars = Math.floor(progress * chars.length);
              }
              return (
                <p
                  key={`${line.time}-${index}`}
                  ref={(node) => {
                    lyricLineRefs.current[index] = node;
                  }}
                  className={isActive ? 'music-lyric active' : 'music-lyric'}
                >
                  {chars.map((char, charIndex) => (
                    <span
                      key={`${charIndex}-${char}`}
                      className={
                        isActive && charIndex < sungChars
                          ? 'music-char-sung'
                          : undefined
                      }
                    >
                      {char}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      )}
      {error && (
        <output className="music-error" aria-live="polite">
          {error}
        </output>
      )}
    </aside>
  );

  return (
    <>
      {/* 歌词面板已在 DOM 中提供全部文本；字幕轨道会形成第二份需要同步的歌词来源 */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        key={audioSource || `loading-${currentQueueItem?.key ?? 'empty'}`}
        ref={audioRef}
        src={audioSource || undefined}
        preload="metadata"
        loop={queue.length === 1}
        onEnded={() => {
          if (queue.length > 1) playQueueOffset(1);
        }}
        onError={() => {
          if (neteaseSong) {
            setPlaying(false);
            setError('');
            setNeteasePlayback({
              songId: neteaseSong.id,
              state: 'error',
              url: '',
            });
            return;
          }
          setError('音轨加载失败，请稍后重试。');
        }}
      />
      {isHome && homeTarget ? createPortal(fullPlayer, homeTarget) : null}
      {!isHome && !isPrivateRoute && (
        <aside className="music-mini-player" aria-label="迷你音乐播放器">
          <span
            className={playing ? 'music-mini-disc playing' : 'music-mini-disc'}
            aria-hidden="true"
          >
            <Music2 />
          </span>
          <span className="music-mini-copy" aria-live="polite">
            <strong title={headingTitle}>{headingTitle}</strong>
            <small title={headingArtist}>{headingArtist}</small>
          </span>
          <button
            className="music-mini-toggle"
            type="button"
            onClick={togglePlayback}
            disabled={!audioSource}
            aria-label={playing ? '暂停音乐' : '播放音乐'}
          >
            {playing ? <Pause /> : <Play />}
          </button>
        </aside>
      )}
    </>
  );
}

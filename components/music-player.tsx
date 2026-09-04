'use client';

import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { homeTrack } from '@/lib/music';

const INITIAL_VOLUME = 0.65;

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(INITIAL_VOLUME);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

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

    // 本地小文件的 loadedmetadata 可能在监听器挂载前就已触发，
    // 不补读一次 duration，进度条会停留在 max=0 无法拖动。
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      updateDuration();
    }
    audio.volume = INITIAL_VOLUME;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('pause', pause);
      audio.removeEventListener('play', play);
      audio.removeEventListener('canplay', recover);
      audio.removeEventListener('playing', recover);
    };
  }, []);

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

  return (
    <aside className="music-player" aria-label="首页音乐播放器">
      <audio
        ref={audioRef}
        src={homeTrack.src}
        preload="metadata"
        loop
        onError={() => setError('音轨加载失败，请稍后重试。')}
      >
        <track
          kind="captions"
          src="/audio/starlight-demo.vtt"
          srcLang="zh"
          label="无歌词器乐说明"
          default
        />
      </audio>
      <div className="music-player-heading">
        <span
          className={playing ? 'music-disc playing' : 'music-disc'}
          aria-hidden="true"
        >
          <Music2 />
        </span>
        <div>
          <span className="music-status">
            {playing ? '正在播放' : '晴空电台'}
          </span>
          <strong>{homeTrack.title}</strong>
          <small>{homeTrack.artist}</small>
        </div>
      </div>
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
      {error && (
        <output className="music-error" aria-live="polite">
          {error}
        </output>
      )}
    </aside>
  );
}

'use client';

import {
  ChevronLeft,
  Crown,
  LogIn,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SongSynth } from '@/lib/rhythm/audio';
import {
  accuracyOf,
  createGame,
  judgeGame,
  ratingOf,
  tickGame,
  type GameState,
  type Judgment,
  type Rating,
} from '@/lib/rhythm/engine';
import {
  chartGameId,
  findRhythmChart,
  RHYTHM_TRACKS,
  type RhythmDifficulty,
  type RhythmTrack,
  type TrackChart,
} from '@/lib/rhythm/tracks';

const LANE_KEYS = ['D', 'F', 'J', 'K'];
const LANE_CODES: Record<string, number> = {
  KeyD: 0,
  KeyF: 1,
  KeyJ: 2,
  KeyK: 3,
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowUp: 2,
  ArrowRight: 3,
};
const DIFFICULTY_ORDER: RhythmDifficulty[] = ['easy', 'normal', 'hard'];
const DIFFICULTY_NAMES: Record<RhythmDifficulty, string> = {
  easy: '轻咏',
  normal: '流光',
  hard: '超载',
};
const SPEED_OPTIONS = [2.1, 1.7, 1.35];

const OFFSET_KEY = 'starbeat.offset';
const SPEED_KEY = 'starbeat.speed';
const bestKey = (gameId: string) => `starbeat.best.${gameId}`;

type ScoreRow = {
  id: string;
  gameId: string;
  username: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  createdAt: number;
};

type BoardData = {
  scores: ScoreRow[];
  canSubmit: boolean;
  csrfToken: string | null;
  personalBest: ScoreRow | null;
};

type Phase = 'title' | 'playing' | 'result';
type UploadState = 'idle' | 'uploading' | 'record' | 'kept' | 'guest' | 'error';

type ResultData = {
  gameId: string;
  trackTitle: string;
  difficulty: RhythmDifficulty;
  score: number;
  accuracy: number;
  maxCombo: number;
  totalNotes: number;
  counts: Record<Judgment, number>;
  rating: Rating;
  fullCombo: boolean;
};

type Selection = {
  track: RhythmTrack;
  chart: TrackChart;
  gameId: string;
  difficulty: RhythmDifficulty;
};

type HitFx = { lane: number; judgment: Judgment; at: number };
type Particle = { lane: number; at: number; color: string; vx: number; vy: number };

const RATING_COLORS: Record<Rating, string> = {
  SSS: '#f2b53c',
  SS: '#f2b53c',
  S: '#5ecfb1',
  A: '#7c9cf0',
  B: '#9aa4b8',
  C: '#c98f6a',
  D: '#e5484d',
};

// 画布颜色跟主题：从 CSS 变量取主色/粉色，取不到就用兜底色
function parseHex(value: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mixWhite(rgb: [number, number, number], ratio: number): string {
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

function toRgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function formatScore(score: number) {
  return String(Math.round(score)).padStart(7, '0');
}

function formatAccuracy(accuracy: number) {
  return `${(accuracy * 100).toFixed(2)}%`;
}

function formatBoardAccuracy(permyriad: number) {
  return `${(permyriad / 100).toFixed(2)}%`;
}

// ===== 排行榜面板 =====

function LeaderboardPanel({
  gameId,
  board,
  loading,
  highlightId,
}: {
  gameId: string;
  board: BoardData | null;
  loading: boolean;
  highlightId?: string | null;
}) {
  const scores = board?.scores ?? [];
  return (
    <div className="sb-board">
      <h2 className="sb-board-title">
        <Trophy aria-hidden="true" />
        云端排行榜
      </h2>
      {loading ? (
        <p className="sb-board-empty">榜单加载中…</p>
      ) : scores.length === 0 ? (
        <p className="sb-board-empty">这个谱面还没有人上榜，来抢第一个「满分传说」吧。</p>
      ) : (
        <ol className="sb-board-list">
          {scores.map((row, index) => (
            <li
              key={row.id}
              className={row.id === highlightId ? 'is-me' : undefined}
            >
              <span className="sb-board-rank">
                {index === 0 ? <Crown aria-hidden="true" /> : index + 1}
              </span>
              <span className="sb-board-name">{row.username}</span>
              <span className="sb-board-score">{formatScore(row.score)}</span>
              <span className="sb-board-acc">{formatBoardAccuracy(row.accuracy)}</span>
            </li>
          ))}
        </ol>
      )}
      {board?.personalBest && (
        <p className="sb-board-mine">
          我的最高：{formatScore(board.personalBest.score)} ·{' '}
          {formatBoardAccuracy(board.personalBest.accuracy)}
        </p>
      )}
      <p className="sb-board-hint">谱面：{gameId}</p>
    </div>
  );
}

// ===== 主组件 =====

export function RhythmGame() {
  const [phase, setPhase] = useState<Phase>('title');
  const [trackIdx, setTrackIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<RhythmDifficulty>('easy');
  const [runStatus, setRunStatus] = useState<'playing' | 'paused' | 'done'>('playing');
  const [result, setResult] = useState<ResultData | null>(null);
  const [upload, setUpload] = useState<UploadState>('idle');
  const [board, setBoard] = useState<BoardData | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardKey, setBoardKey] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startError, setStartError] = useState('');
  const [localBest, setLocalBest] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 640, h: 420 });
  const synthRef = useRef<SongSynth | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const durationRef = useRef(0);
  const offsetRef = useRef(0);
  const scrollSecRef = useRef(SPEED_OPTIONS[1]);
  const pressedRef = useRef([false, false, false, false]);
  const pointersRef = useRef(new Map<number, number>());
  const hitFxRef = useRef<HitFx[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupRef = useRef<{ judgment: Judgment; at: number } | null>(null);
  const comboPopRef = useRef<{ combo: number; at: number }>({ combo: 0, at: 0 });
  const laneColorsRef = useRef<string[]>(['#5368d9', '#8b98e6', '#e08bb0', '#edb0cb']);
  const primaryRgbRef = useRef<[number, number, number]>(parseHex('#5368d9') ?? [83, 104, 217]);
  const pinkRgbRef = useRef<[number, number, number]>(parseHex('#e08bb0') ?? [224, 139, 176]);
  const reducedMotionRef = useRef(false);
  const finishRef = useRef<() => void>(() => undefined);
  const startingRef = useRef(false);

  const track = RHYTHM_TRACKS[trackIdx];
  const gameId = chartGameId(track.id, difficulty);

  // 偏好设置读取/持久化
  useEffect(() => {
    queueMicrotask(() => {
      const storedOffset = Number(localStorage.getItem(OFFSET_KEY) ?? '0');
      if (Number.isFinite(storedOffset)) {
        setOffsetMs(Math.max(-120, Math.min(120, storedOffset)));
      }
      const storedSpeed = Number(localStorage.getItem(SPEED_KEY) ?? '1');
      if (storedSpeed >= 0 && storedSpeed < SPEED_OPTIONS.length) {
        setSpeedIdx(Math.floor(storedSpeed));
      }
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
  }, []);

  useEffect(() => {
    offsetRef.current = offsetMs;
    if (offsetMs !== 0 || localStorage.getItem(OFFSET_KEY) !== null) {
      localStorage.setItem(OFFSET_KEY, String(offsetMs));
    }
  }, [offsetMs]);

  useEffect(() => {
    scrollSecRef.current = SPEED_OPTIONS[speedIdx];
    localStorage.setItem(SPEED_KEY, String(speedIdx));
  }, [speedIdx]);

  // 主题色缓存：canvas 里不能用 color-mix，自己读变量混色
  useEffect(() => {
    const refresh = () => {
      const style = getComputedStyle(document.documentElement);
      const primary = parseHex(style.getPropertyValue('--primary'));
      const pink = parseHex(style.getPropertyValue('--pink'));
      if (primary) primaryRgbRef.current = primary;
      if (pink) pinkRgbRef.current = pink;
      const p = primaryRgbRef.current;
      const k = pinkRgbRef.current;
      laneColorsRef.current = [
        `rgb(${p[0]}, ${p[1]}, ${p[2]})`,
        mixWhite(p, 0.4),
        `rgb(${k[0]}, ${k[1]}, ${k[2]})`,
        mixWhite(k, 0.4),
      ];
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const judgeLatency = useCallback(() => {
    return (synthRef.current?.latencySec ?? 0) + offsetRef.current / 1000;
  }, []);

  // 榜单：标题页与结算页都拉取
  useEffect(() => {
    if (phase === 'playing') return;
    let alive = true;
    const timer = setTimeout(() => {
      setBoardLoading(true);
      if (phase === 'title') {
        setLocalBest(Number(localStorage.getItem(bestKey(gameId)) ?? '0'));
      }
      fetch(`/api/game/scores?game=${encodeURIComponent(gameId)}`)
        .then(async (response) => {
          if (!alive) return;
          if (!response.ok) {
            setBoard(null);
            return;
          }
          setBoard((await response.json()) as BoardData);
        })
        .catch(() => {
          if (alive) setBoard(null);
        })
        .finally(() => {
          if (alive) setBoardLoading(false);
        });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [gameId, phase, boardKey]);

  const submitScore = useCallback(
    async (data: ResultData) => {
      if (!board?.canSubmit || !board.csrfToken) {
        setUpload('guest');
        return;
      }
      setUpload('uploading');
      try {
        const response = await fetch('/api/game/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-community-csrf': board.csrfToken,
          },
          body: JSON.stringify({
            gameId: data.gameId,
            score: data.score,
            accuracy: Math.round(data.accuracy * 10_000),
            maxCombo: data.maxCombo,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          recorded?: boolean;
        };
        if (!response.ok) {
          setUpload('error');
          return;
        }
        setUpload(payload.recorded ? 'record' : 'kept');
        setBoardKey((key) => key + 1);
      } catch {
        setUpload('error');
      }
    },
    [board],
  );

  const finishRun = useCallback(() => {
    const game = gameRef.current;
    const selection = selectionRef.current;
    if (!game || !selection || finishedRef.current) return;
    finishedRef.current = true;
    const accuracy = accuracyOf(game);
    const data: ResultData = {
      gameId: selection.gameId,
      trackTitle: selection.track.title,
      difficulty: selection.difficulty,
      score: Math.round(game.score),
      accuracy,
      maxCombo: game.maxCombo,
      totalNotes: game.totalNotes,
      counts: { ...game.counts },
      rating: ratingOf(accuracy),
      fullCombo: game.counts.miss === 0,
    };
    const prevBest = Number(localStorage.getItem(bestKey(data.gameId)) ?? '0');
    if (data.score > prevBest) localStorage.setItem(bestKey(data.gameId), String(data.score));
    setResult(data);
    setRunStatus('done');
    setPhase('result');
    void submitScore(data);
  }, [submitScore]);

  useEffect(() => {
    finishRef.current = finishRun;
  }, [finishRun]);

  const togglePause = useCallback(
    async (force?: boolean) => {
      const synth = synthRef.current;
      if (!synth || phase !== 'playing' || finishedRef.current) return;
      const next = force ?? !pausedRef.current;
      if (next === pausedRef.current) return;
      pausedRef.current = next;
      setRunStatus(next ? 'paused' : 'playing');
      if (next) await synth.suspend();
      else await synth.resume();
    },
    [phase],
  );

  const startGame = useCallback(async () => {
    const target = findRhythmChart(gameId);
    if (!target || startingRef.current) return;
    startingRef.current = true;
    setStartError('');
    try {
      const synth = synthRef.current ?? (await SongSynth.create());
      synthRef.current = synth;
      selectionRef.current = {
        track: target.track,
        chart: target.chart,
        gameId,
        difficulty,
      };
      gameRef.current = createGame(target.chart.notes, target.track);
      finishedRef.current = false;
      pausedRef.current = false;
      pointersRef.current.clear();
      pressedRef.current = [false, false, false, false];
      hitFxRef.current = [];
      particlesRef.current = [];
      popupRef.current = null;
      comboPopRef.current = { combo: 0, at: 0 };
      synth.start(target.track);
      durationRef.current = synth.durationSec();
      setResult(null);
      setUpload('idle');
      setRunStatus('playing');
      setPhase('playing');
    } catch {
      setStartError('音频引擎初始化失败，请检查浏览器是否允许播放声音。');
    } finally {
      startingRef.current = false;
    }
  }, [gameId, difficulty]);

  const quitGame = useCallback(() => {
    synthRef.current?.dispose();
    synthRef.current = null;
    gameRef.current = null;
    pausedRef.current = false;
    finishedRef.current = false;
    setPhase('title');
  }, []);

  const restartGame = useCallback(() => {
    if (!synthRef.current || !selectionRef.current) return;
    const selection = selectionRef.current;
    gameRef.current = createGame(selection.chart.notes, selection.track);
    finishedRef.current = false;
    pointersRef.current.clear();
    pressedRef.current = [false, false, false, false];
    hitFxRef.current = [];
    particlesRef.current = [];
    popupRef.current = null;
    comboPopRef.current = { combo: 0, at: 0 };
    pausedRef.current = false;
    void synthRef.current.resume();
    synthRef.current.start(selection.track);
    durationRef.current = synthRef.current.durationSec();
    setResult(null);
    setUpload('idle');
    setRunStatus('playing');
    setPhase('playing');
  }, []);

  // 卸载清理
  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  // 键盘输入
  const spawnParticles = useCallback((lane: number, color: string) => {
    if (reducedMotionRef.current) return;
    for (let i = 0; i < 8; i++) {
      const speed = 120 + Math.random() * 160;
      particlesRef.current.push({
        lane,
        at: performance.now(),
        color,
        vx: (Math.random() - 0.5) * speed * 1.6,
        vy: -(60 + Math.random() * speed),
      });
    }
  }, []);

  const handleLaneHit = useCallback(
    (lane: number) => {
      const synth = synthRef.current;
      const game = gameRef.current;
      pressedRef.current[lane] = true;
      if (!synth || !game || pausedRef.current || finishedRef.current) return;
      const outcome = judgeGame(game, lane, synth.songTime(), judgeLatency());
      if (outcome.judgment) {
        synth.playHit(outcome.judgment);
        hitFxRef.current.push({ lane, judgment: outcome.judgment, at: performance.now() });
        popupRef.current = { judgment: outcome.judgment, at: performance.now() };
        if (outcome.judgment !== 'miss') {
          comboPopRef.current = { combo: outcome.combo, at: performance.now() };
          spawnParticles(lane, laneColorsRef.current[lane]);
        }
      }
    },
    [judgeLatency, spawnParticles],
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        void togglePause();
        return;
      }
      const lane = LANE_CODES[event.code];
      if (lane === undefined) return;
      event.preventDefault();
      handleLaneHit(lane);
    };
    const up = (event: KeyboardEvent) => {
      const lane = LANE_CODES[event.code];
      if (lane === undefined) return;
      pressedRef.current[lane] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase, togglePause, handleLaneHit]);

  // 画布尺寸（DPR 适配，模式同 sakura-fall）
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    ctxRef.current = context;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [phase]);

  // 主循环：rAF 只做推进与绘制，时间一律来自 AudioContext
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let running = true;

    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const synth = synthRef.current;
      const game = gameRef.current;
      const context = ctxRef.current;
      if (!synth || !game || !context) return;
      const songTime = synth.songTime();
      const now = performance.now();

      if (!pausedRef.current && !finishedRef.current) {
        const missed = tickGame(game, songTime, judgeLatency());
        if (missed.length > 0) {
          popupRef.current = { judgment: 'miss', at: now };
        }
        if (songTime > durationRef.current + 0.9) {
          finishRef.current();
        }
      }

      // ===== 绘制 =====
      const { w, h } = sizeRef.current;
      const primary = primaryRgbRef.current;
      const fieldW = Math.min(w * 0.94, 4 * 120);
      const laneW = fieldW / 4;
      const fieldX = (w - fieldW) / 2;
      const keypadH = 64;
      const judgeY = h - keypadH - 44;
      const speed = (judgeY + 80) / scrollSecRef.current;
      const selection = selectionRef.current;

      context.clearRect(0, 0, w, h);

      // 轨道底与按压高亮
      for (let lane = 0; lane < 4; lane++) {
        const x = fieldX + lane * laneW;
        if (pressedRef.current[lane]) {
          const gradient = context.createLinearGradient(0, judgeY, 0, 0);
          gradient.addColorStop(0, toRgba(primary, 0.22));
          gradient.addColorStop(1, toRgba(primary, 0));
          context.fillStyle = gradient;
          context.fillRect(x + 2, 0, laneW - 4, judgeY);
        }
        context.strokeStyle = toRgba(primary, 0.16);
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, judgeY);
        context.stroke();
      }
      context.strokeStyle = toRgba(primary, 0.16);
      context.beginPath();
      context.moveTo(fieldX + fieldW - 0.5, 0);
      context.lineTo(fieldX + fieldW - 0.5, judgeY);
      context.stroke();

      // 音符
      const laneColors = laneColorsRef.current;
      for (let lane = 0; lane < 4; lane++) {
        const arr = game.laneNotes[lane];
        const startX = fieldX + lane * laneW + 7;
        const noteW = laneW - 14;
        const from = Math.max(0, game.lanePos[lane] - 8);
        for (let i = from; i < arr.length; i++) {
          const note = arr[i];
          const y = judgeY - (note.time - songTime) * speed;
          if (y < -60) break;
          if (y > h + 40) continue;
          if (note.state === 'hit') continue;
          context.fillStyle =
            note.state === 'missed' ? toRgba(primary, 0.14) : laneColors[lane];
          const radius = note.state === 'missed' ? 5 : 8;
          context.beginPath();
          context.roundRect(startX, y - 10, noteW, 20, radius);
          context.fill();
          if (note.state === 'pending') {
            context.fillStyle = 'rgba(255, 255, 255, 0.34)';
            context.beginPath();
            context.roundRect(startX + 3, y - 7, noteW - 6, 5, 3);
            context.fill();
          }
        }
      }

      // 判定线
      const judgeGlow = context.createLinearGradient(0, judgeY - 14, 0, judgeY + 8);
      judgeGlow.addColorStop(0, toRgba(primary, 0));
      judgeGlow.addColorStop(1, toRgba(primary, 0.2));
      context.fillStyle = judgeGlow;
      context.fillRect(fieldX, judgeY - 14, fieldW, 22);
      context.fillStyle = toRgba(primary, 0.85);
      context.beginPath();
      context.roundRect(fieldX, judgeY - 2, fieldW, 4, 2);
      context.fill();

      // 击打特效
      hitFxRef.current = hitFxRef.current.filter((fx) => now - fx.at < 360);
      for (const fx of hitFxRef.current) {
        const age = (now - fx.at) / 360;
        const cx = fieldX + fx.lane * laneW + laneW / 2;
        context.strokeStyle = toRgba(primary, 0.7 * (1 - age));
        context.lineWidth = 2;
        context.beginPath();
        context.arc(cx, judgeY, 8 + age * 26, 0, Math.PI * 2);
        context.stroke();
      }
      particlesRef.current = particlesRef.current.filter((p) => now - p.at < 460);
      for (const p of particlesRef.current) {
        const age = (now - p.at) / 1000;
        const x = fieldX + p.lane * laneW + laneW / 2 + p.vx * age;
        const y = judgeY + p.vy * age + 300 * age * age;
        context.fillStyle = p.color.replace('rgb(', 'rgba(').replace(')', `, ${Math.max(0, 1 - age * 2.2)})`);
        context.fillRect(x - 1.5, y - 1.5, 3, 3);
      }

      // 键位提示
      const keyLabels = LANE_KEYS;
      for (let lane = 0; lane < 4; lane++) {
        const x = fieldX + lane * laneW + 6;
        const y = h - keypadH + 8;
        const pressed = pressedRef.current[lane];
        context.fillStyle = pressed ? laneColors[lane] : toRgba(primary, 0.1);
        context.beginPath();
        context.roundRect(x, y, laneW - 12, keypadH - 16, 10);
        context.fill();
        context.fillStyle = pressed ? '#ffffff' : toRgba(primary, 0.75);
        context.font = "700 17px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(keyLabels[lane], x + (laneW - 12) / 2, y + (keypadH - 16) / 2 + 1);
      }

      // HUD：分数 / 准确率
      const acc = accuracyOf(game);
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillStyle = toRgba(primary, 0.9);
      context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillText(formatScore(game.score), fieldX, 12);
      context.textAlign = 'right';
      context.font = "600 14px 'Microsoft YaHei UI', system-ui, sans-serif";
      context.fillStyle = toRgba(primary, 0.6);
      context.fillText(formatAccuracy(acc), fieldX + fieldW, 18);

      // 连击
      const comboAge = (now - comboPopRef.current.at) / 240;
      if (game.combo >= 2) {
        const scale = 1 + Math.max(0, 1 - comboAge) * 0.22;
        context.save();
        context.translate(fieldX + fieldW / 2, judgeY - 88);
        context.scale(scale, scale);
        context.textAlign = 'center';
        context.fillStyle = toRgba(primary, 0.92);
        context.font = "800 44px Georgia, 'Songti SC', serif";
        context.fillText(String(game.combo), 0, 0);
        context.font = "600 12px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.fillStyle = toRgba(primary, 0.55);
        context.fillText('COMBO', 0, 48);
        context.restore();
      }

      // 判定文字
      const popup = popupRef.current;
      if (popup && now - popup.at < 480) {
        const age = (now - popup.at) / 480;
        const colors: Record<Judgment, string> = {
          perfect: '#f2b53c',
          great: '#5ecfb1',
          good: '#9aa4b8',
          miss: '#e5484d',
        };
        context.save();
        context.globalAlpha = 1 - age * age;
        context.textAlign = 'center';
        context.fillStyle = colors[popup.judgment];
        context.font = "800 21px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.fillText(
          popup.judgment.toUpperCase(),
          fieldX + fieldW / 2,
          judgeY - 130 - age * 16,
        );
        context.restore();
      }

      // 进度条
      const progress = Math.max(0, Math.min(1, songTime / Math.max(durationRef.current, 1)));
      context.fillStyle = toRgba(primary, 0.12);
      context.fillRect(0, 0, w, 3);
      context.fillStyle = toRgba(primary, 0.75);
      context.fillRect(0, 0, w * progress, 3);

      // READY / GO
      if (songTime < 1.4 && selection) {
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = toRgba(primary, 0.85);
        context.font = "800 34px Georgia, 'Songti SC', serif";
        context.fillText(songTime < 0.9 ? 'READY' : 'GO!', w / 2, h * 0.34);
      }

      // 曲名水印
      if (selection) {
        context.textAlign = 'left';
        context.textBaseline = 'bottom';
        context.fillStyle = toRgba(primary, 0.4);
        context.font = "600 13px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.fillText(
          `${selection.track.title} · ${DIFFICULTY_NAMES[selection.difficulty]}`,
          fieldX,
          h - keypadH - 12,
        );
      }
    };

    raf = requestAnimationFrame(loop);
    const onVisibility = () => {
      if (document.hidden) void togglePause(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase, togglePause, judgeLatency]);

  // 触屏：按住轨道即判定，支持多点
  const laneFromClientX = (clientX: number, rect: DOMRect) => {
    const { w } = sizeRef.current;
    const fieldW = Math.min(w * 0.94, 4 * 120);
    const fieldX = (rect.width - fieldW) / 2;
    const relative = clientX - rect.left - fieldX;
    if (relative < 0 || relative > fieldW) return null;
    return Math.max(0, Math.min(3, Math.floor(relative / (fieldW / 4))));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || pausedRef.current || finishedRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const lane = laneFromClientX(event.clientX, rect);
    if (lane === null) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, lane);
    handleLaneHit(lane);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const lane = pointersRef.current.get(event.pointerId);
    if (lane === undefined) return;
    pointersRef.current.delete(event.pointerId);
    const stillHeld = [...pointersRef.current.values()].includes(lane);
    if (!stillHeld) pressedRef.current[lane] = false;
  };

  const resultBoardHighlight = upload === 'record' ? (board?.personalBest?.id ?? null) : null;
  const selectedChartNotes = findRhythmChart(gameId)?.chart.notes.length ?? 0;

  return (
    <div className="starbeat">
      <div className="sb-main">
        {phase === 'title' && (
          <div className="sb-panel">
            <div className="sb-logo">
              <Music2 aria-hidden="true" className="sb-logo-icon" />
              <span className="sb-logo-cn">星屿音击</span>
              <span className="sb-logo-en">STARBEAT</span>
            </div>
            <p className="sb-tagline">
              落下式四键音游：音符沿轨道落到判定线时按下对应按键。
              三首站内原创合成曲，音频与谱面同源生成，节奏分毫不差。
            </p>
            <div className="sb-tracks">
              {RHYTHM_TRACKS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sb-track${index === trackIdx ? ' is-active' : ''}`}
                  onClick={() => setTrackIdx(index)}
                >
                  <span className="sb-track-title">{item.title}</span>
                  <span className="sb-track-sub">{item.subtitle}</span>
                  <span className="sb-track-meta">{item.bpm} BPM</span>
                </button>
              ))}
            </div>
            <fieldset className="sb-diff-row">
              {DIFFICULTY_ORDER.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  className={`sb-diff${difficulty === diff ? ' is-active' : ''}`}
                  onClick={() => setDifficulty(diff)}
                >
                  {DIFFICULTY_NAMES[diff]}
                </button>
              ))}
            </fieldset>
            <div className="sb-start-row">
              <button type="button" className="button primary sb-start" onClick={() => void startGame()}>
                <Play aria-hidden="true" />
                开始演奏
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="校准与速度设置"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <Settings2 aria-hidden="true" />
              </button>
              <span className="sb-start-meta">
                {selectedChartNotes} 音符 · 本机最高 {formatScore(localBest)}
              </span>
            </div>
            {settingsOpen && (
              <div className="sb-settings">
                <label className="sb-setting">
                  <span>判定偏移 {offsetMs > 0 ? `+${offsetMs}` : offsetMs} ms</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={5}
                    value={offsetMs}
                    onChange={(event) => setOffsetMs(Number(event.target.value))}
                  />
                  <small>总觉得「按晚了」就往正调，「按早了」往负调。</small>
                </label>
                <div className="sb-setting">
                  <span>下落速度</span>
                  <div className="sb-speed-row">
                    {SPEED_OPTIONS.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`sb-speed${speedIdx === index ? ' is-active' : ''}`}
                        onClick={() => setSpeedIdx(index)}
                      >
                        {['慢', '中', '快'][index]}
                      </button>
                    ))}
                  </div>
                  <small>越快越容易看清节奏，但反应时间更短。</small>
                </div>
              </div>
            )}
            {startError && <p className="sb-error">{startError}</p>}
            <p className="sb-help">
              键盘 D F J K（或方向键）· 触屏直接点轨道 · Esc 暂停 ·
              全 PERFECT 恰好 1,000,000 分
            </p>
          </div>
        )}

        {phase === 'playing' && (
          <div className="sb-stage">
            <canvas
              ref={canvasRef}
              className="sb-canvas"
              aria-label="星屿音击游玩画面"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onContextMenu={(event) => event.preventDefault()}
            />
            <button
              type="button"
              className="icon-button sb-pause-btn"
              aria-label={runStatus === 'paused' ? '继续' : '暂停'}
              onClick={() => void togglePause()}
            >
              {runStatus === 'paused' ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </button>
            {runStatus === 'paused' && (
              <dialog open className="sb-overlay" aria-label="游戏暂停">
                <h2>暂停中</h2>
                <p>呼吸，听节拍，回来。</p>
                <div className="sb-overlay-actions">
                  <button type="button" className="button primary" onClick={() => void togglePause(false)}>
                    <Play aria-hidden="true" />
                    继续
                  </button>
                  <button type="button" className="button ghost" onClick={restartGame}>
                    <RotateCcw aria-hidden="true" />
                    重开
                  </button>
                  <button type="button" className="button ghost" onClick={quitGame}>
                    <ChevronLeft aria-hidden="true" />
                    退出
                  </button>
                </div>
              </dialog>
            )}
          </div>
        )}

        {phase === 'result' && result && (
          <div className="sb-panel sb-result">
            <div className="sb-result-head">
              <span className="sb-result-song">{result.trackTitle}</span>
              <span className="sb-result-diff">{DIFFICULTY_NAMES[result.difficulty]}</span>
              <span
                className="sb-result-rating"
                style={{ color: RATING_COLORS[result.rating] }}
              >
                {result.rating}
              </span>
            </div>
            <p className="sb-result-score">{formatScore(result.score)}</p>
            <p className="sb-result-sub">
              准确率 {formatAccuracy(result.accuracy)} · 最大连击 {result.maxCombo}
              {result.fullCombo ? ' · FULL COMBO!' : ''}
            </p>
            <div className="sb-result-counts">
              <span className="is-perfect">PERFECT {result.counts.perfect}</span>
              <span className="is-great">GREAT {result.counts.great}</span>
              <span className="is-good">GOOD {result.counts.good}</span>
              <span className="is-miss">MISS {result.counts.miss}</span>
            </div>
            <p className="sb-upload" data-state={upload}>
              {upload === 'uploading' && '成绩上传中…'}
              {upload === 'record' && '新纪录！已登上云端排行榜。'}
              {upload === 'kept' && '成绩已提交，云端保留你的历史最高分。'}
              {upload === 'guest' && (
                <>
                  <LogIn aria-hidden="true" />
                  登录社区账号后成绩可上榜：
                  <Link href="/community/me">前往登录</Link>
                </>
              )}
              {upload === 'error' && '成绩上传失败，网络恢复后再打一把吧。'}
              {upload === 'idle' && ''}
            </p>
            <div className="sb-overlay-actions">
              <button type="button" className="button primary" onClick={restartGame}>
                <RotateCcw aria-hidden="true" />
                再来一局
              </button>
              <button type="button" className="button ghost" onClick={quitGame}>
                <ChevronLeft aria-hidden="true" />
                选曲
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="sb-side">
        <LeaderboardPanel
          gameId={gameId}
          board={board}
          loading={boardLoading && phase !== 'playing'}
          highlightId={resultBoardHighlight}
        />
      </aside>
    </div>
  );
}

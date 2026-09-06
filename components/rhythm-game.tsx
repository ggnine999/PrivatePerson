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
  X,
} from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SongSynth } from '@/lib/rhythm/audio';
import {
  accuracyOf,
  createGame,
  judgeGame,
  ratingOf,
  releaseGame,
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
const DEFAULT_LANE_CODES = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
const ARROW_CODES: Record<string, number> = {
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowUp: 2,
  ArrowRight: 3,
};
const MODIFIER_PREFIXES = ['Shift', 'Control', 'Alt', 'Meta'];
const KEYS_STORE_KEY = 'starbeat.keys';

function keyLabel(code: string) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const named: Record<string, string> = {
    ArrowLeft: '←',
    ArrowDown: '↓',
    ArrowUp: '↑',
    ArrowRight: '→',
    Space: '空格',
    Semicolon: ';',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Quote: "'",
    BracketLeft: '[',
    BracketRight: ']',
  };
  return named[code] ?? code;
}
const DIFFICULTY_ORDER: RhythmDifficulty[] = ['easy', 'normal', 'hard'];
const DIFFICULTY_NAMES: Record<RhythmDifficulty, string> = {
  easy: '轻咏',
  normal: '流光',
  hard: '超载',
};
const SPEED_OPTIONS = [2.1, 1.7, 1.35];

const OFFSET_KEY = 'starbeat.offset';
const SPEED_KEY = 'starbeat.speed';
const TEMPO_KEY = 'starbeat.tempo';
const TEMPO_OPTIONS = [1, 1.25, 1.5, 2];
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
type UploadState = 'idle' | 'uploading' | 'record' | 'kept' | 'guest' | 'skipped' | 'error';

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
  tempoMul: number;
};

type HitFx = { lane: number; judgment: Judgment; at: number };
type Particle = { lane: number; at: number; color: string; s: number; vx: number; vy: number };

// 判定粒子配色：完美=彩色，优秀=金色，良好=蓝色，Miss=红色
const JUDGMENT_PARTICLE_COLORS: Record<Judgment, string[]> = {
  perfect: ['#f2b53c', '#5ecfb1', '#7c9cf0', '#e08bb0', '#f5f7ff'],
  great: ['#f2b53c', '#ffd97a', '#ffb347', '#fff3c4'],
  good: ['#7c9cf0', '#4fa8f0', '#a8c0ff', '#5ec0e8'],
  miss: ['#e5484d', '#ff7a7a', '#c73a3f'],
};

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

// 粒子颜色统一转成 rgb() 字符串，绘制时好叠加透明度
function toRgbStr(color: string): string {
  if (color.startsWith('rgb')) return color;
  const rgb = parseHex(color);
  return rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : color;
}

// 环绕星轨粒子的宇宙配色
const ORBITER_COLORS = [
  'rgb(139, 156, 245)',
  'rgb(94, 207, 177)',
  'rgb(224, 139, 176)',
  'rgb(242, 181, 60)',
  'rgb(223, 230, 255)',
];

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
  const [tempoIdx, setTempoIdx] = useState(0);
  const [keyBindings, setKeyBindings] = useState<string[]>([...DEFAULT_LANE_CODES]);
  const [listeningLane, setListeningLane] = useState<number | null>(null);
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
  const shakeRef = useRef({ mag: 0, at: 0 });
  const milestoneRef = useRef<{ combo: number; at: number } | null>(null);
  const ambientRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      at: number;
      life: number;
      color: string;
      s: number;
      sway: number;
      phase: number;
    }>
  >([]);
  const popupRef = useRef<{ judgment: Judgment; at: number } | null>(null);
  const comboPopRef = useRef<{ combo: number; at: number }>({ combo: 0, at: 0 });
  const laneColorsRef = useRef<string[]>(['#5368d9', '#8b98e6', '#e08bb0', '#edb0cb']);
  const primaryRgbRef = useRef<[number, number, number]>(parseHex('#5368d9') ?? [83, 104, 217]);
  const pinkRgbRef = useRef<[number, number, number]>(parseHex('#e08bb0') ?? [224, 139, 176]);
  const reducedMotionRef = useRef(false);
  const keysRef = useRef<string[]>([...DEFAULT_LANE_CODES]);
  const starsRef = useRef<Array<{ x: number; y: number; r: number; phase: number; speed: number }>>([]);
  const orbitersRef = useRef<
    Array<{
      radius: number;
      angle: number;
      speed: number;
      squash: number;
      size: number;
      phase: number;
      color: string;
    }>
  >([]);
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
      const storedTempo = Number(localStorage.getItem(TEMPO_KEY) ?? '0');
      if (storedTempo >= 0 && storedTempo < TEMPO_OPTIONS.length) {
        setTempoIdx(Math.floor(storedTempo));
      }
      try {
        const storedKeys: unknown = JSON.parse(
          localStorage.getItem(KEYS_STORE_KEY) ?? 'null',
        );
        if (
          Array.isArray(storedKeys) &&
          storedKeys.length === 4 &&
          storedKeys.every((code) => typeof code === 'string' && code.length > 0)
        ) {
          setKeyBindings(storedKeys as string[]);
        }
      } catch {
        // 存档损坏则用默认键位
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

  useEffect(() => {
    localStorage.setItem(TEMPO_KEY, String(tempoIdx));
  }, [tempoIdx]);

  useEffect(() => {
    keysRef.current = keyBindings;
    localStorage.setItem(KEYS_STORE_KEY, JSON.stringify(keyBindings));
  }, [keyBindings]);

  // 主题色缓存：canvas 里不能用 color-mix，自己读变量混色。
  // 全屏层内重定义了暗色变量，因此优先从画布所在作用域读取。
  useEffect(() => {
    const refresh = () => {
      const style = getComputedStyle(
        canvasRef.current ?? document.documentElement,
      );
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
  }, [phase]);

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
    // 0 分（全 MISS）没有上榜意义
    if (data.score <= 0) {
      setUpload('skipped');
    } else {
      void submitScore(data);
    }
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
    setListeningLane(null);
    try {
      const synth = synthRef.current ?? (await SongSynth.create());
      synthRef.current = synth;
      selectionRef.current = {
        track: target.track,
        chart: target.chart,
        gameId,
        difficulty,
        tempoMul: TEMPO_OPTIONS[tempoIdx],
      };
      gameRef.current = createGame(target.chart.notes, target.track, TEMPO_OPTIONS[tempoIdx]);
      finishedRef.current = false;
      pausedRef.current = false;
      pointersRef.current.clear();
      pressedRef.current = [false, false, false, false];
      hitFxRef.current = [];
      particlesRef.current = [];
      popupRef.current = null;
      comboPopRef.current = { combo: 0, at: 0 };
      synth.start(target.track, TEMPO_OPTIONS[tempoIdx]);
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
  }, [gameId, difficulty, tempoIdx]);

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
    gameRef.current = createGame(selection.chart.notes, selection.track, selection.tempoMul);
    finishedRef.current = false;
    pointersRef.current.clear();
    pressedRef.current = [false, false, false, false];
    hitFxRef.current = [];
    particlesRef.current = [];
    popupRef.current = null;
    comboPopRef.current = { combo: 0, at: 0 };
    pausedRef.current = false;
    void synthRef.current.resume();
    synthRef.current.start(selection.track, selection.tempoMul);
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

  // 全屏游玩期间锁定页面滚动
  useEffect(() => {
    if (phase === 'title') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  // 键盘输入
  const spawnParticles = useCallback((lane: number, judgment: Judgment) => {
    if (reducedMotionRef.current) return;
    const palette = JUDGMENT_PARTICLE_COLORS[judgment];
    const count = judgment === 'perfect' ? 14 : judgment === 'great' ? 10 : 8;
    const power = judgment === 'perfect' ? 1.35 : 1;
    for (let i = 0; i < count; i++) {
      const speed = (110 + Math.random() * 160) * power;
      particlesRef.current.push({
        lane,
        at: performance.now(),
        color: toRgbStr(palette[Math.floor(Math.random() * palette.length)]),
        s: judgment === 'perfect' ? 4 : 3,
        vx: (Math.random() - 0.5) * speed * 1.6,
        vy: -(60 + Math.random() * speed),
      });
    }
  }, []);

  // 非 Miss 判定的全屏氛围粒子：撒向背景天空与左右两侧，长寿命缓缓上浮
  const spawnAmbient = useCallback((judgment: Judgment) => {
    if (reducedMotionRef.current) return;
    const palette = JUDGMENT_PARTICLE_COLORS[judgment];
    const count = judgment === 'perfect' ? 18 : judgment === 'great' ? 12 : 8;
    const { w, h } = sizeRef.current;
    for (let i = 0; i < count; i++) {
      const zone = Math.random();
      let x: number;
      let y: number;
      if (zone < 0.4) {
        // 背景天空
        x = w * (0.06 + Math.random() * 0.88);
        y = h * (0.04 + Math.random() * 0.3);
      } else if (zone < 0.7) {
        // 左侧
        x = w * 0.02 + Math.random() * w * 0.08;
        y = h * (0.15 + Math.random() * 0.6);
      } else {
        // 右侧
        x = w * (0.9 + Math.random() * 0.08);
        y = h * (0.15 + Math.random() * 0.6);
      }
      ambientRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -(15 + Math.random() * 45),
        at: performance.now(),
        life: 1300 + Math.random() * 900,
        color: toRgbStr(palette[Math.floor(Math.random() * palette.length)]),
        s: 1.5 + Math.random() * 2.5,
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      });
    }
    // 防止高频连击时无限堆积
    if (ambientRef.current.length > 240) {
      ambientRef.current.splice(0, ambientRef.current.length - 240);
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
        // 四级判定各自配色：完美=彩色 / 优秀=金色 / 良好=蓝色 / Miss=红色
        spawnParticles(lane, outcome.judgment);
        if (outcome.judgment !== 'miss') {
          comboPopRef.current = { combo: outcome.combo, at: performance.now() };
          // 全屏氛围粒子：背景 + 左右两侧同步点亮
          spawnAmbient(outcome.judgment);
          if (!reducedMotionRef.current) {
            // 高调震屏：判定越好抖得越狠，里程碑重震
            const mag =
              outcome.judgment === 'perfect'
                ? 6.5
                : outcome.judgment === 'great'
                  ? 4.2
                  : 3;
            shakeRef.current = { mag, at: performance.now() };
            // 连击里程碑：每 25 连击荡开冲击波 + 全屏重震
            if (outcome.combo > 0 && outcome.combo % 25 === 0) {
              milestoneRef.current = { combo: outcome.combo, at: performance.now() };
              shakeRef.current = { mag: 8, at: performance.now() };
            }
          }
        }
      }
    },
    [judgeLatency, spawnParticles, spawnAmbient],
  );

  const handleLaneRelease = useCallback(
    (lane: number) => {
      const synth = synthRef.current;
      const game = gameRef.current;
      if (!synth || !game || pausedRef.current || finishedRef.current) return;
      const outcome = releaseGame(game, lane, synth.songTime(), judgeLatency());
      if (outcome.broke) {
        popupRef.current = { judgment: 'miss', at: performance.now() };
        // 长条中途松手：红色粒子提示中断
        spawnParticles(lane, 'miss');
      }
    },
    [judgeLatency, spawnParticles],
  );

  // 自定义按键监听：点击设置里的键位格后，捕获下一个按键完成换绑
  useEffect(() => {
    if (listeningLane === null) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        setListeningLane(null);
        return;
      }
      if (MODIFIER_PREFIXES.some((prefix) => event.code.startsWith(prefix))) return;
      setKeyBindings((prev) => {
        const next = [...prev];
        const clash = next.indexOf(event.code);
        if (clash !== -1 && clash !== listeningLane) {
          // 与其他轨道冲突：两轨交换
          next[clash] = next[listeningLane];
        }
        next[listeningLane] = event.code;
        return next;
      });
      setListeningLane(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listeningLane]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const laneFromCode = (code: string) => {
      const bound = keysRef.current.indexOf(code);
      if (bound !== -1) return bound;
      return ARROW_CODES[code] ?? null;
    };
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        void togglePause();
        return;
      }
      const lane = laneFromCode(event.code);
      if (lane === null) return;
      event.preventDefault();
      handleLaneHit(lane);
    };
    const up = (event: KeyboardEvent) => {
      const lane = laneFromCode(event.code);
      if (lane === undefined || lane === null) return;
      pressedRef.current[lane] = false;
      handleLaneRelease(lane);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase, togglePause, handleLaneHit, handleLaneRelease]);

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
          // 漏掉的音符在对应轨道炸开红色粒子
          for (const m of missed.slice(0, 4)) {
            spawnParticles(m.lane, 'miss');
          }
        }
        if (songTime > durationRef.current + 0.9) {
          finishRef.current();
        }
      }

      // ===== 3D 舞台绘制：透视跑道 + 星野 =====
      const { w, h } = sizeRef.current;
      const primary = primaryRgbRef.current;
      const pink = pinkRgbRef.current;
      const fieldW = Math.min(w * 0.98, 4 * 165);
      const laneW = fieldW / 4;
      const fieldX = (w - fieldW) / 2;
      const judgeY = h - 58;
      const horizonY = Math.max(70, Math.min(h * 0.26, judgeY - 210));
      const vanishX = w / 2;
      const selection = selectionRef.current;
      const noteR = Math.max(15, Math.min(laneW * 0.32, 30));
      // 节拍相位：判定座呼吸与地面脉冲共用（由音频时钟驱动）
      const spb = selection ? 60 / (selection.track.bpm * selection.tempoMul) : 0.5;
      const beatPhase = selection ? (((songTime / spb) % 1) + 1) % 1 : 0;
      const DEPTH = 3.1;
      const minS = 1 / (1 + DEPTH);
      // 深度映射：t=0 音符抵达判定线，t=1 在地平线；返回缩放比 f（0 远 → 1 近）
      const depthF = (t: number) => {
        const s = 1 / (1 + Math.max(t, -0.45) * DEPTH);
        return (s - minS) / (1 - minS);
      };
      // 宽消失带：地平线处轨道仍保持 42% 间距，避免远处挤成一团
      const vanX = (edge: number) => vanishX + (edge - 2) * laneW * 0.42;
      const yAt = (t: number) => horizonY + (judgeY - horizonY) * depthF(t);
      const xAt = (lane: number, t: number) => {
        const f = depthF(t);
        const laneCx = fieldX + (lane + 0.5) * laneW;
        const vanLane = vanishX + (lane - 1.5) * laneW * 0.42;
        return vanLane + (laneCx - vanLane) * f;
      };

      context.clearRect(0, 0, w, h);

      // 打击震屏：命中后短促抖动（尊重减少动态偏好）
      const shakeAge = (now - shakeRef.current.at) / 200;
      context.save();
      if (!reducedMotionRef.current && shakeAge < 1 && shakeRef.current.mag > 0) {
        const decay = (1 - shakeAge) * shakeRef.current.mag;
        context.translate(
          (Math.random() - 0.5) * 2 * decay,
          (Math.random() - 0.5) * 2 * decay,
        );
      }

      // 深空底色：从顶部深蓝黑到地平线的微紫
      const sky = context.createLinearGradient(0, 0, 0, judgeY);
      sky.addColorStop(0, '#04050c');
      sky.addColorStop(0.55, '#0a0d1c');
      sky.addColorStop(1, '#11152b');
      context.fillStyle = sky;
      context.fillRect(0, 0, w, h);

      // 星云：两团缓慢漂移的彩色薄雾
      if (!reducedMotionRef.current) {
        const drift = now * 0.00004;
        for (const [offset, rgb, radius] of [
          [0, primary, 0.5],
          [Math.PI, pink, 0.42],
        ] as Array<[number, [number, number, number], number]>) {
          const nx = w * (0.5 + 0.22 * Math.sin(drift + offset));
          const ny = horizonY * (0.55 + 0.2 * Math.cos(drift * 1.3 + offset));
          const nebula = context.createRadialGradient(nx, ny, 0, nx, ny, Math.max(w, h) * radius);
          nebula.addColorStop(0, toRgba(rgb, 0.1));
          nebula.addColorStop(1, toRgba(rgb, 0));
          context.fillStyle = nebula;
          context.fillRect(0, 0, w, horizonY + 90);
        }
      }

      // 星野：闪烁的星星（首次绘制时生成，之后复用）
      if (starsRef.current.length === 0) {
        starsRef.current = Array.from({ length: 90 }, () => ({
          x: Math.random(),
          y: Math.random(),
          r: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
        }));
      }
      for (const star of starsRef.current) {
        const starY = star.y * (horizonY + 60);
        const twinkle = reducedMotionRef.current
          ? 0.5
          : 0.35 + 0.45 * Math.abs(Math.sin(now * 0.001 * star.speed + star.phase));
        context.fillStyle = `rgba(226, 232, 255, ${twinkle})`;
        context.fillRect(star.x * w, starY, star.r, star.r);
      }

      // 环绕星轨：一群长寿命粒子围绕跑道尽头公转（椭圆轨道 + 短彗尾），宇宙感
      if (orbitersRef.current.length === 0) {
        orbitersRef.current = Array.from({ length: 56 }, () => ({
          radius: 0.16 + Math.random() * 0.85,
          angle: Math.random() * Math.PI * 2,
          speed: (0.08 + Math.random() * 0.28) * (Math.random() > 0.5 ? 1 : -1),
          squash: 0.3 + Math.random() * 0.25,
          size: 1.2 + Math.random() * 2.2,
          phase: Math.random() * Math.PI * 2,
          color: ORBITER_COLORS[Math.floor(Math.random() * ORBITER_COLORS.length)],
        }));
      }
      const orbitT = reducedMotionRef.current ? 0 : now * 0.001;
      for (const orbiter of orbitersRef.current) {
        const angle = orbiter.angle + orbitT * orbiter.speed;
        const rx = orbiter.radius * w * 0.55;
        const ry = rx * orbiter.squash;
        const ox = vanishX + Math.cos(angle) * rx;
        const oy = horizonY + Math.sin(angle) * ry * 0.8;
        // 呼吸亮度：慢速明暗变化
        const glow =
          0.25 +
          0.35 * Math.abs(Math.sin(now * 0.001 * orbiter.speed * 3 + orbiter.phase));
        // 短彗尾：沿公转方向的一小段渐隐弧线（克制，不抢跑道）
        if (!reducedMotionRef.current) {
          const dir = Math.sign(orbiter.speed) || 1;
          context.globalAlpha = glow * 0.16;
          context.strokeStyle = orbiter.color;
          context.lineWidth = orbiter.size * 0.55;
          context.beginPath();
          context.ellipse(
            vanishX,
            horizonY,
            rx,
            ry,
            0,
            angle - dir * 0.07,
            angle + (dir < 0 ? 0.001 : 0),
          );
          context.stroke();
        }
        // 粒子本体：地平线以下的部分压暗，像沉到跑道玻璃后面
        const below = oy > horizonY + 14;
        context.globalAlpha = glow * (below ? 0.3 : 0.85);
        context.fillStyle = orbiter.color;
        context.beginPath();
        context.arc(ox, oy, orbiter.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }

      // 全屏氛围粒子：判定时撒向背景与两侧的长寿命光点，缓缓上浮摇摆
      ambientRef.current = ambientRef.current.filter((p) => now - p.at < p.life);
      for (const p of ambientRef.current) {
        const age = (now - p.at) / p.life;
        const ax =
          p.x + p.vx * age + Math.sin(now * 0.002 + p.phase) * p.sway * age;
        const ay = p.y + p.vy * age;
        const alpha = Math.min(1, age * 6) * Math.pow(1 - age, 1.3);
        context.globalAlpha = alpha * 0.85;
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(ax, ay, p.s, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      // 地平线辉光
      const horizonGlow = context.createLinearGradient(0, horizonY - 60, 0, horizonY + 70);
      horizonGlow.addColorStop(0, toRgba(primary, 0));
      horizonGlow.addColorStop(0.62, toRgba(primary, 0.16));
      horizonGlow.addColorStop(0.78, toRgba(pink, 0.12));
      horizonGlow.addColorStop(1, toRgba(primary, 0));
      context.fillStyle = horizonGlow;
      context.fillRect(0, horizonY - 60, w, 130);

      // 镜头随节拍呼吸：每个节拍轻微推拉，营造临场感
      const breathe = reducedMotionRef.current
        ? 1
        : 1 + 0.022 * (1 - beatPhase);
      context.save();
      context.translate(vanishX, judgeY);
      context.scale(breathe, breathe);
      context.translate(-vanishX, -judgeY);

      // 透视跑道：向宽消失带汇聚的轨道边界线
      const groundFar = horizonY + 2;
      for (let edge = 0; edge <= 4; edge++) {
        const bottomX = fieldX + edge * laneW;
        const lineGrad = context.createLinearGradient(0, groundFar, 0, judgeY);
        lineGrad.addColorStop(0, toRgba(primary, 0.02));
        lineGrad.addColorStop(0.75, toRgba(primary, 0.3));
        lineGrad.addColorStop(1, toRgba(primary, 0.45));
        context.strokeStyle = lineGrad;
        context.lineWidth = edge === 0 || edge === 4 ? 2 : 1.2;
        context.beginPath();
        context.moveTo(vanX(edge), groundFar);
        context.lineTo(bottomX, judgeY);
        context.stroke();
      }
      // 地面网格横线（远处密、近处疏，营造纵深）
      for (const gt of [0.12, 0.26, 0.42, 0.58, 0.74, 0.88]) {
        const gy = yAt(gt);
        const gf = depthF(gt);
        const leftX = vanX(0) + (fieldX - vanX(0)) * gf;
        const rightX = vanX(4) + (fieldX + fieldW - vanX(4)) * gf;
        context.strokeStyle = toRgba(primary, 0.05 + 0.1 * gf);
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(leftX, gy);
        context.lineTo(rightX, gy);
        context.stroke();
      }
      // 踩在节拍上的脉冲波：每个节拍从地平线推向判定线一次
      if (selection && beatPhase < 0.92 && songTime > 0) {
        const pulseT = beatPhase / 0.92;
        const pulseY = yAt(pulseT);
        const pf = depthF(pulseT);
        const leftX = vanX(0) + (fieldX - vanX(0)) * pf;
        const rightX = vanX(4) + (fieldX + fieldW - vanX(4)) * pf;
        context.strokeStyle = toRgba(primary, 0.22 * (1 - pulseT * 0.7));
        context.lineWidth = 1.5 + 2.5 * (1 - pulseT);
        context.beginPath();
        context.moveTo(leftX, pulseY);
        context.lineTo(rightX, pulseY);
        context.stroke();
      }

      // 判定座：轨道底部的圆形按键座，音符落点
      const laneColors = laneColorsRef.current;
      for (let lane = 0; lane < 4; lane++) {
        const laneCx = fieldX + lane * laneW + laneW / 2;
        const color = laneColors[lane];
        const pressed = pressedRef.current[lane];
        context.save();
        if (pressed) {
          context.shadowColor = color;
          context.shadowBlur = 18;
        }
        context.fillStyle = 'rgba(8, 10, 20, 0.92)';
        context.beginPath();
        context.arc(laneCx, judgeY, noteR, 0, Math.PI * 2);
        context.fill();
        context.restore();
        // 待机时判定座随节拍轻微呼吸
        const breathe = 0.5 + 0.3 * (1 - beatPhase);
        context.strokeStyle = pressed ? color : toRgba(primary, breathe);
        context.lineWidth = pressed ? 3.5 : 2 + 0.9 * (1 - beatPhase);
        context.beginPath();
        context.arc(laneCx, judgeY, noteR, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = pressed ? '#ffffff' : toRgba(primary, 0.7);
        context.font = "700 12px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(LANE_KEYS[lane], laneCx, judgeY + 1);
      }

      // 音符：沿透视跑道飞来的圆形音符盘，长条为锥形光带
      const scrollSec = scrollSecRef.current;
      for (let lane = 0; lane < 4; lane++) {
        const arr = game.laneNotes[lane];
        const from = Math.max(0, game.lanePos[lane] - 10);
        for (let i = arr.length - 1; i >= from; i--) {
          const note = arr[i];
          if (note.state === 'hit') continue;
          const holding = note.state === 'holding';
          // 按住中的长条：头部钉在判定座上（t=0），等尾端到达，不随时间继续前移
          const t = holding ? 0 : (note.time - songTime) / scrollSec;
          if (!holding && t > 1) continue;
          const f = depthF(t);
          // 飞出镜头后方（f 过大）或缩放异常（f 非正）的不再绘制
          if (!holding && (f <= 0.02 || f > 1.5)) continue;
          const isHold = (note.dur ?? 0) > 0;
          const color = laneColors[lane];
          const dim = note.state === 'missed';
          const r = noteR * f;
          const nx = xAt(lane, t);
          const ny = yAt(t);
          if (isHold) {
            // 尾端钳制在地平线以内：按住初期尾端尚在远处，避免负宽度的鬼影
            const tTail = Math.min((note.endTime - songTime) / scrollSec, 1);
            const fTail = Math.min(Math.max(depthF(tTail), 0.05), 1.5);
            const headX = nx;
            const headY = ny;
            const tailX = xAt(lane, tTail);
            const tailY = yAt(tTail);
            const wHead = r * 0.82;
            const wTail = noteR * fTail * 0.82;
            if (headY > tailY) {
              context.globalAlpha = dim ? 0.18 : note.state === 'holding' ? 0.72 : 0.38;
              context.fillStyle = color;
              context.beginPath();
              context.moveTo(headX - wHead, headY);
              context.lineTo(headX + wHead, headY);
              context.lineTo(tailX + wTail, tailY);
              context.lineTo(tailX - wTail, tailY);
              context.closePath();
              context.fill();
              context.globalAlpha = dim ? 0.25 : 0.65;
              context.strokeStyle = color;
              context.lineWidth = 2.5;
              context.beginPath();
              context.arc(tailX, tailY, noteR * fTail * 0.55, 0, Math.PI * 2);
              context.stroke();
              context.globalAlpha = 1;
            }
          }
          if (ny > h + r * 2) continue;
          // 逼近拖尾：身后一道渐隐光痕
          if (!dim && t > 0.02 && t < 0.82) {
            const tBack = Math.min(t + 0.08, 1);
            const trailGrad = context.createLinearGradient(nx, ny, xAt(lane, tBack), yAt(tBack));
            trailGrad.addColorStop(0, toRgba(primary, 0.38 * f));
            trailGrad.addColorStop(1, toRgba(primary, 0));
            context.strokeStyle = trailGrad;
            context.lineWidth = r * 0.7;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(nx, ny);
            context.lineTo(xAt(lane, tBack), yAt(tBack));
            context.stroke();
            context.lineCap = 'butt';
          }
          // 圆形音符盘：远处小而暗，越近越大越亮；在地平线辉光里淡入
          context.save();
          const fadeIn = t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1;
          context.globalAlpha = (dim ? 0.25 : Math.min(1, 0.3 + f * 0.8)) * fadeIn;
          if (!dim) {
            context.shadowColor = color;
            context.shadowBlur = 8 + 18 * f;
          }
          const disc = context.createRadialGradient(
            nx,
            ny - r * 0.35,
            r * 0.15,
            nx,
            ny,
            r,
          );
          disc.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          disc.addColorStop(0.5, color);
          disc.addColorStop(1, toRgba(primary, 0.8));
          context.fillStyle = disc;
          context.beginPath();
          context.arc(nx, ny, r, 0, Math.PI * 2);
          context.fill();
          context.lineWidth = Math.max(2, 3 * f);
          context.strokeStyle = dim ? toRgba(primary, 0.4) : 'rgba(255, 255, 255, 0.78)';
          context.beginPath();
          context.arc(nx, ny, Math.max(1, r - 1.5), 0, Math.PI * 2);
          context.stroke();
          context.restore();
          context.fillStyle = dim ? 'rgba(255, 255, 255, 0.45)' : '#ffffff';
          context.font = `800 ${Math.max(11, Math.round(r * 1.05))}px 'Microsoft YaHei UI', system-ui, sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText('♪', nx, ny + 1);
        }
      }

      // 击打特效：光柱 + 扩散环
      hitFxRef.current = hitFxRef.current.filter((fx) => now - fx.at < 360);
      for (const fx of hitFxRef.current) {
        const age = (now - fx.at) / 360;
        const cx = fieldX + fx.lane * laneW + laneW / 2;
        if (now - fx.at < 220) {
          const pillarAlpha = 0.42 * (1 - (now - fx.at) / 220);
          const pillar = context.createLinearGradient(0, judgeY, 0, judgeY - 320);
          pillar.addColorStop(0, toRgba(primary, pillarAlpha));
          pillar.addColorStop(1, toRgba(primary, 0));
          context.fillStyle = pillar;
          context.fillRect(cx - laneW * 0.42, judgeY - 320, laneW * 0.84, 320);
          // 光柱核心：一道更亮的细柱
          context.fillStyle = `rgba(255, 255, 255, ${0.3 * (1 - (now - fx.at) / 220)})`;
          context.fillRect(cx - 2.5, judgeY - 320, 5, 320);
        }
        context.strokeStyle = toRgba(primary, 0.75 * (1 - age));
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(cx, judgeY, noteR + age * 34, 0, Math.PI * 2);
        context.stroke();
      }
      particlesRef.current = particlesRef.current.filter((p) => now - p.at < 460);
      for (const p of particlesRef.current) {
        const age = (now - p.at) / 1000;
        const x = fieldX + p.lane * laneW + laneW / 2 + p.vx * age;
        const y = judgeY + p.vy * age + 300 * age * age;
        context.fillStyle = p.color.replace('rgb(', 'rgba(').replace(')', `, ${Math.max(0, 1 - age * 2.2)})`);
        context.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      }

      // 连击里程碑：每 25 连击从判定座中心荡开一圈冲击波
      if (milestoneRef.current) {
        const age = (now - milestoneRef.current.at) / 620;
        if (age >= 1) {
          milestoneRef.current = null;
        } else if (!reducedMotionRef.current) {
          const waveR = 30 + age * fieldW * 0.75;
          context.strokeStyle = toRgba(primary, 0.6 * (1 - age));
          context.lineWidth = 0.5 + 3 * (1 - age);
          context.beginPath();
          context.arc(w / 2, judgeY - 40, waveR, 0, Math.PI * 2);
          context.stroke();
          context.strokeStyle = toRgba(pinkRgbRef.current, 0.4 * (1 - age));
          context.lineWidth = 1.5;
          context.beginPath();
          context.arc(w / 2, judgeY - 40, waveR * 0.72, 0, Math.PI * 2);
          context.stroke();
          context.fillStyle = toRgba(primary, 0.09 * (1 - age));
          context.beginPath();
          context.arc(w / 2, judgeY - 40, waveR, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore(); // 结束镜头呼吸变换

      // HUD（Phigros 布局）：准确率左上 / 分数右上
      const acc = accuracyOf(game);
      context.textBaseline = 'top';
      context.textAlign = 'left';
      context.font = "600 14px 'Microsoft YaHei UI', system-ui, sans-serif";
      context.fillStyle = toRgba(primary, 0.6);
      context.fillText(formatAccuracy(acc), fieldX, 18);
      context.textAlign = 'right';
      context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
      context.fillStyle = toRgba(primary, 0.9);
      context.fillText(formatScore(game.score), fieldX + fieldW, 12);

      // 连击
      const comboAge = (now - comboPopRef.current.at) / 240;
      if (game.combo >= 2) {
        const scale = 1 + Math.max(0, 1 - comboAge) * 0.26;
        context.save();
        context.translate(fieldX + fieldW / 2, judgeY - 88);
        context.scale(scale, scale);
        context.textAlign = 'center';
        const comboColor = game.combo >= 25 ? '#f2b53c' : toRgba(primary, 0.92);
        context.fillStyle = comboColor;
        context.font = "800 56px Georgia, 'Songti SC', serif";
        context.fillText(String(game.combo), 0, 0);
        context.font = "600 12px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.fillStyle = toRgba(primary, 0.55);
        context.fillText('COMBO', 0, 48);
        context.restore();
      }

      // 判定文字（四级评分：完美/优秀/良好/Miss）
      const popup = popupRef.current;
      if (popup && now - popup.at < 480) {
        const age = (now - popup.at) / 480;
        const colors: Record<Judgment, string> = {
          perfect: '#f2b53c',
          great: '#5ecfb1',
          good: '#9aa4b8',
          miss: '#e5484d',
        };
        const labels: Record<Judgment, string> = {
          perfect: '完美',
          great: '优秀',
          good: '良好',
          miss: 'Miss',
        };
        context.save();
        context.globalAlpha = 1 - age * age;
        const pop = 1 + 0.35 * (1 - age);
        context.translate(fieldX + fieldW / 2, judgeY - 130 - age * 16);
        context.scale(pop, pop);
        context.textAlign = 'center';
        context.fillStyle = colors[popup.judgment];
        if (popup.judgment !== 'miss') {
          context.shadowColor = colors[popup.judgment];
          context.shadowBlur = 16;
        }
        context.font = "800 30px 'Microsoft YaHei UI', system-ui, sans-serif";
        context.fillText(labels[popup.judgment], 0, 0);
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
          h - 10,
        );
      }
      context.restore();
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
  }, [phase, togglePause, judgeLatency, spawnParticles]);

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
    if (!stillHeld) {
      pressedRef.current[lane] = false;
      handleLaneRelease(lane);
    }
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
                {selectedChartNotes} 音符 · {Math.round(track.bpm * TEMPO_OPTIONS[tempoIdx])} BPM ·
                本机最高 {formatScore(localBest)}
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
                <div className="sb-setting">
                  <span>音乐倍速</span>
                  <div className="sb-speed-row">
                    {TEMPO_OPTIONS.map((mul, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`sb-speed${tempoIdx === index ? ' is-active' : ''}`}
                        onClick={() => setTempoIdx(index)}
                      >
                        {mul}×
                      </button>
                    ))}
                  </div>
                  <small>音频与谱面同步加速：音符更密、歌曲更短，成绩与原速同榜。</small>
                </div>
                <div className="sb-setting">
                  <span>自定义按键</span>
                  <div className="sb-key-row">
                    {keyBindings.map((code, lane) => (
                      <button
                        key={lane}
                        type="button"
                        className={`sb-key${listeningLane === lane ? ' is-listening' : ''}`}
                        onClick={() => setListeningLane(lane)}
                      >
                        {listeningLane === lane ? '按键…' : keyLabel(code)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="sb-key-reset"
                      onClick={() => {
                        setKeyBindings([...DEFAULT_LANE_CODES]);
                        setListeningLane(null);
                      }}
                    >
                      恢复默认
                    </button>
                  </div>
                  <small>点击一格再按下想用的键；与其他轨道冲突会自动交换；Esc 取消。方向键始终可用。</small>
                </div>
              </div>
            )}
            {startError && <p className="sb-error">{startError}</p>}
            <p className="sb-help">
              音符落线时按对应键（默认 D F J K，可在设置里自定义 / 触屏点轨道）·
              长条按住到尾端再松 · Esc 暂停 · 全 PERFECT 恰好 1,000,000 分
            </p>
          </div>
        )}

        {phase === 'playing' &&
          createPortal(
          <div className="sb-fullscreen">
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
              <button
                type="button"
                className="icon-button sb-exit-btn"
                aria-label="退出游玩"
                onClick={quitGame}
              >
                <X aria-hidden="true" />
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
            </div>,
            document.body,
          )}

        {phase === 'result' && result &&
          createPortal(
          <div className="sb-fullscreen sb-fullscreen-center">
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
              <span className="is-perfect">完美 {result.counts.perfect}</span>
              <span className="is-great">优秀 {result.counts.great}</span>
              <span className="is-good">良好 {result.counts.good}</span>
              <span className="is-miss">Miss {result.counts.miss}</span>
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
              {upload === 'skipped' && '本局没有得分，成绩就不上榜啦。'}
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
          </div>,
          document.body,
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

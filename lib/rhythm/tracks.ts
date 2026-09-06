// 星屿音击（StarBeat）：内置曲目数据。
//
// 音频与谱面同源：这里的音符时间轴既驱动 Web Audio 合成（lib/rhythm/audio.ts），
// 也用于生成下落式谱面（buildChart），因此音画天然零漂移、零版权、零外部资源。
// 谱面由确定性算法生成（无随机），同一谱面所有人看到的音符完全一致，排行榜才公平。
//
// 旋律手写作曲；贝斯/和弦垫/鼓组用小节模式串描述。MIDI 音高 60 = C4。

export type RhythmDifficulty = 'easy' | 'normal' | 'hard';

export type SongEvent =
  | { t: 'lead'; beat: number; dur: number; midi: number; gain?: number }
  | { t: 'bass'; beat: number; dur: number; midi: number; gain?: number }
  | { t: 'pad'; beat: number; dur: number; midis: number[]; gain?: number }
  | { t: 'kick'; beat: number; gain?: number }
  | { t: 'snare'; beat: number; gain?: number }
  | { t: 'hat'; beat: number; gain?: number };

export type ChartNote = { beat: number; lane: number; /** 长条音符的持续拍数（tap 无此字段） */ dur?: number };

export type TrackChart = {
  difficulty: RhythmDifficulty;
  label: string;
  notes: ChartNote[];
};

export type RhythmTrack = {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  bars: number;
  lead: { wave: OscillatorType; cutoff: number; gain: number };
  bass: { wave: OscillatorType; cutoff: number; gain: number };
  padGain: number;
  drumGain: number;
  events: SongEvent[];
};

const BEATS_PER_BAR = 4;
export const DIFFICULTIES: RhythmDifficulty[] = ['easy', 'normal', 'hard'];
const DIFFICULTY_LABELS: Record<RhythmDifficulty, string> = {
  easy: '轻咏',
  normal: '流光',
  hard: '超载',
};

// ===== 作曲辅助 =====

// 旋律：[小节, 拍, 时值(拍), MIDI]
type MelodySpec = Array<[number, number, number, number]>;

function lead(spec: MelodySpec, barOffset = 0, gain?: number): SongEvent[] {
  return spec.map(([bar, beat, dur, midi]) => ({
    t: 'lead',
    beat: (bar + barOffset) * BEATS_PER_BAR + beat,
    dur,
    midi,
    ...(gain !== undefined ? { gain } : {}),
  }));
}

// 和弦垫：每项一个小节的和弦音组
function pads(chords: number[][], barOffset = 0, dur = BEATS_PER_BAR, gain?: number): SongEvent[] {
  return chords.map((midis, index) => ({
    t: 'pad',
    beat: (index + barOffset) * BEATS_PER_BAR,
    dur,
    midis,
    ...(gain !== undefined ? { gain } : {}),
  }));
}

// 贝斯：每小节根音 + 8 分音符模式串（'x' 击发，'-' 休止）
function bassLine(
  roots: number[],
  fromBar: number,
  pattern: string,
  dur: number,
  gain?: number,
): SongEvent[] {
  const step = BEATS_PER_BAR / pattern.length;
  const events: SongEvent[] = [];
  roots.forEach((midi, index) => {
    for (let slot = 0; slot < pattern.length; slot++) {
      if (pattern[slot] !== 'x') continue;
      events.push({
        t: 'bass',
        beat: (fromBar + index) * BEATS_PER_BAR + slot * step,
        dur,
        midi,
        ...(gain !== undefined ? { gain } : {}),
      });
    }
  });
  return events;
}

// 鼓组：单小节模式串循环 n 个小节
function drumLine(
  kind: 'kick' | 'snare' | 'hat',
  pattern: string,
  fromBar: number,
  bars: number,
  gain?: number,
): SongEvent[] {
  const step = BEATS_PER_BAR / pattern.length;
  const events: SongEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    for (let slot = 0; slot < pattern.length; slot++) {
      if (pattern[slot] !== 'x') continue;
      events.push({
        t: kind,
        beat: (fromBar + bar) * BEATS_PER_BAR + slot * step,
        ...(gain !== undefined ? { gain } : {}),
      });
    }
  }
  return events;
}

// ===== 曲目一「初雪」：90 BPM · A 小调 · 温柔入门 =====
// 结构：0–7 前奏（和弦垫 + 铃音）→ 8–15 A 段 → 16–23 B 段 → 24–31 A' → 32–35 尾声

const FIRST_SNOW_CHORDS: number[][] = (() => {
  const Am = [57, 60, 64];
  const F = [53, 57, 60];
  const C = [55, 60, 64];
  const G = [55, 59, 62];
  const loop = [Am, F, C, G];
  return [...loop, ...loop, ...loop, ...loop, Am, Am];
})();

const FIRST_SNOW_A: MelodySpec = [
  [8, 0, 1.5, 76], [8, 2, 1, 72], [8, 3, 1, 69],
  [9, 0, 1.5, 69], [9, 2, 2, 72],
  [10, 0, 1, 74], [10, 1, 1, 72], [10, 2, 2, 67],
  [11, 0, 2, 67], [11, 2, 1, 71], [11, 3, 1, 74],
  [12, 0, 1.5, 76], [12, 2, 1, 72], [12, 3, 1, 76],
  [13, 0, 2, 77], [13, 2, 1, 76], [13, 3, 1, 72],
  [14, 0, 1.5, 74], [14, 2, 2, 72],
  [15, 0, 3, 67],
];

const FIRST_SNOW_B: MelodySpec = [
  [16, 0, 1, 81], [16, 1, 0.5, 79], [16, 1.5, 0.5, 76], [16, 2, 2, 72],
  [17, 0, 1.5, 77], [17, 2, 2, 76],
  [18, 0, 1, 76], [18, 1, 1, 72], [18, 2, 2, 79],
  [19, 0, 1.5, 74], [19, 2, 2, 71],
  [20, 0, 1, 81], [20, 1, 0.5, 79], [20, 1.5, 0.5, 76], [20, 2, 2, 72],
  [21, 0, 1.5, 77], [21, 2, 2, 81],
  [22, 0, 1, 79], [22, 1, 1, 76], [22, 2, 2, 72],
  [23, 0, 3, 74],
];

const FIRST_SNOW_BASS_ROOTS: number[] = (() => {
  // 每 2 小节一个和弦：Am F C G ×4 + 尾声 Am Am
  const roots = [45, 41, 48, 43];
  const bars: number[] = [];
  for (let slot = 0; slot < 18; slot++) {
    const root = slot < 16 ? roots[slot % 4] : 45;
    bars.push(root, root);
  }
  return bars;
})();

function firstSnow(): RhythmTrack {
  return {
    id: 'first-snow',
    title: '初雪',
    subtitle: '落在窗台的第一场雪，慢慢来。',
    bpm: 90,
    bars: 36,
    lead: { wave: 'triangle', cutoff: 2400, gain: 0.17 },
    bass: { wave: 'triangle', cutoff: 520, gain: 0.2 },
    padGain: 0.045,
    drumGain: 0.7,
    events: [
      ...pads(FIRST_SNOW_CHORDS, 0, 8),
      ...lead(
        [
          [6, 0, 2, 76], [6, 2, 2, 72],
          [7, 0, 4, 74],
        ],
        0,
        0.7,
      ),
      ...lead(FIRST_SNOW_A),
      ...lead(FIRST_SNOW_B),
      ...lead(FIRST_SNOW_A, 16),
      ...lead(
        [
          [32, 0, 2, 72], [32, 2, 2, 69],
          [34, 0, 4, 64],
        ],
        0,
        0.8,
      ),
      ...bassLine(FIRST_SNOW_BASS_ROOTS.slice(4), 4, 'x----x--', 1.4, 0.85),
      ...drumLine('hat', 'x-x-x-x-', 4, 32, 0.4),
      ...drumLine('kick', 'x----x--', 8, 24, 0.75),
      ...drumLine('snare', '----x---', 8, 24, 0.5),
    ],
  };
}

// ===== 曲目二「霓虹小巷」：128 BPM · E 小调 · 合成器浪潮 =====
// 结构：0–3 前奏 → 4–7 渐入 → 8–15 A 段 → 16–23 B 段 → 24–31 A' → 32–35 间奏 → 36–39 终段

const NEON_CHORDS: number[][] = (() => {
  const Em = [52, 55, 59];
  const C = [48, 52, 55];
  const G = [55, 59, 62];
  const D = [50, 54, 57];
  const loop = [Em, C, G, D];
  return Array.from({ length: 10 }, () => loop).flat();
})();

const NEON_ROOTS: number[] = (() => {
  const roots = [40, 36, 43, 38];
  return Array.from({ length: 40 }, (_, bar) => roots[bar % 4]);
})();

const NEON_A: MelodySpec = [
  [8, 0, 0.5, 64], [8, 0.5, 0.5, 67], [8, 1, 1, 71], [8, 2, 0.5, 71], [8, 2.5, 0.5, 69], [8, 3, 1, 67],
  [9, 0, 0.5, 67], [9, 0.5, 0.5, 64], [9, 1, 1, 60], [9, 2, 2, 64],
  [10, 0, 0.5, 62], [10, 0.5, 0.5, 67], [10, 1, 1, 71], [10, 2, 0.5, 74], [10, 2.5, 0.5, 71], [10, 3, 1, 69],
  [11, 0, 0.5, 69], [11, 0.5, 0.5, 66], [11, 1, 1, 62], [11, 2, 2, 69],
  [12, 0, 0.5, 76], [12, 0.5, 0.5, 74], [12, 1, 0.5, 71], [12, 1.5, 0.5, 74], [12, 2, 1, 76], [12, 3, 1, 74],
  [13, 0, 0.5, 72], [13, 0.5, 0.5, 76], [13, 1, 1, 79], [13, 2, 2, 76],
  [14, 0, 0.5, 74], [14, 0.5, 0.5, 71], [14, 1, 1, 67], [14, 2, 0.5, 71], [14, 2.5, 0.5, 74], [14, 3, 1, 79],
  [15, 0, 1.5, 78], [15, 2, 2, 74],
];

const NEON_B: MelodySpec = [
  [16, 0, 1.5, 79], [16, 2, 0.5, 76], [16, 2.5, 0.5, 74], [16, 3, 1, 71],
  [17, 0, 1, 72], [17, 1.5, 0.5, 76], [17, 2, 2, 79],
  [18, 0, 1.5, 74], [18, 2, 0.5, 71], [18, 2.5, 0.5, 74], [18, 3, 1, 79],
  [19, 0, 1, 78], [19, 1.5, 0.5, 74], [19, 2, 2, 69],
  [20, 0, 1.5, 79], [20, 2, 0.5, 76], [20, 2.5, 0.5, 74], [20, 3, 1, 71],
  [21, 0, 1, 72], [21, 1.5, 0.5, 76], [21, 2, 2, 83],
  [22, 0, 1, 81], [22, 1, 1, 79], [22, 2, 0.5, 76], [22, 2.5, 0.5, 79], [22, 3, 1, 74],
  [23, 0, 2, 78], [23, 2, 2, 74],
];

const NEON_OUTRO: MelodySpec = [
  [36, 0, 0.5, 64], [36, 0.5, 0.5, 67], [36, 1, 1, 71], [36, 2, 0.5, 71], [36, 2.5, 0.5, 69], [36, 3, 1, 67],
  [37, 0, 0.5, 67], [37, 0.5, 0.5, 64], [37, 1, 1, 60], [37, 2, 2, 64],
  [38, 0, 0.5, 62], [38, 0.5, 0.5, 67], [38, 1, 1, 71], [38, 2, 0.5, 74], [38, 2.5, 0.5, 71], [38, 3, 1, 69],
  [39, 0, 3, 64],
];

function neonAlley(): RhythmTrack {
  return {
    id: 'neon-alley',
    title: '霓虹小巷',
    subtitle: '午夜的霓虹灯牌，一格一格往下跳。',
    bpm: 128,
    bars: 40,
    lead: { wave: 'square', cutoff: 1900, gain: 0.13 },
    bass: { wave: 'sawtooth', cutoff: 680, gain: 0.16 },
    padGain: 0.04,
    drumGain: 0.85,
    events: [
      ...pads(NEON_CHORDS, 0, 4, 1),
      ...lead(
        [
          [4, 0, 1, 64], [4, 2, 1, 67],
          [5, 0, 1, 67], [5, 2, 1, 64],
          [6, 0, 1, 62], [6, 2, 1, 67],
          [7, 0, 1, 66], [7, 2, 1, 69],
        ],
        0,
        0.75,
      ),
      ...lead(NEON_A),
      ...lead(NEON_B),
      ...lead(NEON_A, 16),
      ...lead(NEON_OUTRO),
      ...bassLine(NEON_ROOTS.slice(4), 4, 'x-x-x-x-', 0.4),
      ...drumLine('kick', 'x-x-x-x-', 4, 36),
      ...drumLine('snare', '--x---x-', 4, 36, 0.55),
      ...drumLine('hat', '-x-x-x-x', 4, 36, 0.5),
    ],
  };
}

// ===== 曲目三「超新星」：170 BPM · D 小调 · 高速压轴 =====
// 结构：0–3 前奏 → 4–7 渐入 → 8–15 A → 16–23 B → 24–31 A' → 32–39 B' → 40–47 终段（16 分连打）

const SUPERNOVA_CHORDS: number[][] = (() => {
  const Dm = [50, 53, 57];
  const Bb = [46, 50, 53];
  const F = [53, 57, 60];
  const C = [48, 52, 55];
  const loop = [Dm, Bb, F, C];
  return Array.from({ length: 12 }, () => loop).flat();
})();

const SUPERNOVA_ROOTS: number[] = (() => {
  const roots = [38, 34, 41, 36];
  return Array.from({ length: 48 }, (_, bar) => roots[bar % 4]);
})();

const SUPERNOVA_A: MelodySpec = [
  [8, 0, 0.5, 74], [8, 0.5, 0.5, 77], [8, 1, 0.5, 81], [8, 1.5, 0.5, 77], [8, 2, 1, 74], [8, 3, 0.5, 77], [8, 3.5, 0.5, 81],
  [9, 0, 0.5, 82], [9, 0.5, 0.5, 79], [9, 1, 0.5, 77], [9, 1.5, 1.5, 74],
  [10, 0, 0.5, 77], [10, 0.5, 0.5, 81], [10, 1, 0.5, 84], [10, 1.5, 0.5, 81], [10, 2, 1, 77], [10, 3, 1, 72],
  [11, 0, 0.5, 79], [11, 0.5, 0.5, 76], [11, 1, 0.5, 72], [11, 1.5, 0.5, 76], [11, 2, 2, 79],
  [12, 0, 0.5, 74], [12, 0.5, 0.5, 77], [12, 1, 0.5, 81], [12, 1.5, 0.5, 77], [12, 2, 0.5, 74], [12, 2.5, 0.5, 77], [12, 3, 0.5, 81], [12, 3.5, 0.5, 84],
  [13, 0, 0.5, 86], [13, 0.5, 0.5, 84], [13, 1, 0.5, 82], [13, 1.5, 0.5, 79], [13, 2, 2, 77],
  [14, 0, 0.5, 77], [14, 0.5, 0.5, 81], [14, 1, 0.5, 84], [14, 1.5, 0.5, 81], [14, 2, 1, 77], [14, 3, 1, 81],
  [15, 0, 0.5, 79], [15, 0.5, 0.5, 76], [15, 1, 0.5, 72], [15, 1.5, 0.5, 76], [15, 2, 2, 74],
];

const SUPERNOVA_B: MelodySpec = [
  [16, 0, 0.75, 81], [16, 1, 0.25, 79], [16, 1.5, 0.5, 77], [16, 2, 1, 74], [16, 3, 0.5, 77], [16, 3.5, 0.5, 79],
  [17, 0, 0.75, 79], [17, 1, 0.25, 77], [17, 1.5, 0.5, 75], [17, 2, 2, 77],
  [18, 0, 0.75, 77], [18, 1, 0.25, 76], [18, 1.5, 0.5, 72], [18, 2, 1, 69], [18, 3, 0.5, 72], [18, 3.5, 0.5, 76],
  [19, 0, 0.75, 79], [19, 1, 0.25, 76], [19, 1.5, 0.5, 72], [19, 2, 2, 67],
  [20, 0, 0.75, 81], [20, 1, 0.25, 79], [20, 1.5, 0.5, 77], [20, 2, 1, 74], [20, 3, 0.5, 77], [20, 3.5, 0.5, 79],
  [21, 0, 0.75, 82], [21, 1, 0.25, 81], [21, 1.5, 0.5, 77], [21, 2, 2, 79],
  [22, 0, 0.5, 84], [22, 0.5, 0.5, 81], [22, 1, 0.5, 79], [22, 1.5, 0.5, 81], [22, 2, 0.5, 84], [22, 2.5, 0.5, 81], [22, 3, 0.5, 79], [22, 3.5, 0.5, 76],
  [23, 0, 1, 74], [23, 1.5, 0.5, 76], [23, 2, 2, 77],
];

const SUPERNOVA_FINALE: MelodySpec = [
  [40, 0, 0.5, 74], [40, 0.5, 0.5, 77], [40, 1, 0.5, 81], [40, 1.5, 0.5, 77], [40, 2, 1, 74], [40, 3, 0.5, 77], [40, 3.5, 0.5, 81],
  [41, 0, 0.5, 82], [41, 0.5, 0.5, 79], [41, 1, 0.5, 77], [41, 1.5, 0.5, 75], [41, 2, 2, 74],
  [42, 0, 0.5, 77], [42, 0.5, 0.5, 81], [42, 1, 0.5, 84], [42, 1.5, 0.5, 81], [42, 2, 1, 77], [42, 3, 1, 72],
  [43, 0, 0.5, 79], [43, 0.5, 0.5, 76], [43, 1, 0.5, 72], [43, 1.5, 0.5, 76], [43, 2, 2, 79],
  [44, 0, 0.5, 86], [44, 0.5, 0.5, 84], [44, 1, 0.5, 82], [44, 1.5, 0.5, 84], [44, 2, 0.5, 86], [44, 2.5, 0.5, 84], [44, 3, 0.5, 82], [44, 3.5, 0.5, 79],
  [45, 0, 0.5, 81], [45, 0.5, 0.5, 79], [45, 1, 0.5, 77], [45, 1.5, 0.5, 79], [45, 2, 2, 77],
  [46, 0, 0.25, 74], [46, 0.25, 0.25, 77], [46, 0.5, 0.25, 81], [46, 0.75, 0.25, 77],
  [46, 1, 0.25, 74], [46, 1.25, 0.25, 77], [46, 1.5, 0.25, 81], [46, 1.75, 0.25, 77],
  [46, 2, 0.25, 74], [46, 2.25, 0.25, 77], [46, 2.5, 0.25, 81], [46, 2.75, 0.25, 84],
  [46, 3, 0.25, 86], [46, 3.25, 0.25, 84], [46, 3.5, 0.25, 82], [46, 3.75, 0.25, 81],
  [47, 0, 4, 74],
];

const SUPERNOVA_INTRO: MelodySpec = [
  [4, 0, 1, 62], [4, 2, 1, 65],
  [5, 0, 1, 62], [5, 2, 1, 65],
  [6, 0, 1, 65], [6, 2, 1, 69],
  [7, 0, 1, 64], [7, 2, 1, 67],
];

function supernova(): RhythmTrack {
  return {
    id: 'supernova',
    title: '超新星',
    subtitle: '坍缩、压缩，然后在最后一小节爆发。',
    bpm: 170,
    bars: 48,
    lead: { wave: 'sawtooth', cutoff: 2600, gain: 0.14 },
    bass: { wave: 'square', cutoff: 620, gain: 0.15 },
    padGain: 0.035,
    drumGain: 1,
    events: [
      ...pads(SUPERNOVA_CHORDS, 0, 4, 1),
      ...lead(SUPERNOVA_INTRO, 0, 0.8),
      ...lead(SUPERNOVA_A),
      ...lead(SUPERNOVA_B),
      ...lead(SUPERNOVA_A, 16),
      ...lead(SUPERNOVA_B, 16),
      ...lead(SUPERNOVA_FINALE),
      ...bassLine(SUPERNOVA_ROOTS.slice(4), 4, 'x-x-x-x-', 0.35),
      ...drumLine('kick', 'x-x-x-x-', 4, 44),
      ...drumLine('snare', '--x---x-', 4, 44, 0.6),
      ...drumLine('hat', 'xxxxxxxx', 4, 44, 0.4),
      // 终段前一小节：军鼓滚奏推向高潮
      ...drumLine('snare', '----xxxxxxxxxxxx', 47, 1, 0.5),
    ],
  };
}

export const RHYTHM_TRACKS: RhythmTrack[] = [firstSnow(), neonAlley(), supernova()];

// ===== 谱面生成 =====

type ChartConfig = {
  grid: number;
  minGap: number;
  bassFill: 'none' | 'downbeat' | 'gaps';
};

const CHART_CONFIGS: Record<RhythmDifficulty, ChartConfig> = {
  easy: { grid: 0.5, minGap: 1, bassFill: 'none' },
  normal: { grid: 0.5, minGap: 0.5, bassFill: 'downbeat' },
  hard: { grid: 0.25, minGap: 0.25, bassFill: 'gaps' },
};

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

// 轨道分配：音高轮廓 → 左右移动，低音在左、高音在右；
// 同音近距离连打时向内侧换轨（反弹），避免键盘上同一根手指连点。
// 长条音符会占用轨道直到尾部 + 间隙，冲突时向邻近空轨偏移。
function assignLanes(
  notes: Array<{ beat: number; midi: number; hold?: number }>,
): ChartNote[] {
  let lastLane = 1;
  let lastBeat = -Infinity;
  let lastMidi: number | null = null;
  const busyUntil = [-Infinity, -Infinity, -Infinity, -Infinity];
  const out: ChartNote[] = [];
  for (const note of notes) {
    const anchor = Math.max(0, Math.min(3, Math.floor((note.midi - 55) / 7)));
    let lane: number;
    if (lastMidi === null || note.beat - lastBeat >= 2) {
      lane = anchor;
    } else {
      const sameNote = note.midi === lastMidi;
      const smallGap = note.beat - lastBeat <= 0.5 + 1e-6;
      if (sameNote && smallGap) {
        const dir = lastLane <= 1 ? 1 : -1;
        lane = lastLane + dir;
        if (lane < 0 || lane > 3) lane = lastLane - dir;
      } else if (sameNote) {
        lane = lastLane;
      } else {
        const dir = note.midi > lastMidi ? 1 : -1;
        lane = lastLane + dir;
        if (lane < 0 || lane > 3) lane = lastLane - dir;
      }
    }
    // 长条占用检查：候选轨道忙则向邻近空轨偏移（长条同时最多一条，必有空轨）
    if (note.beat < busyUntil[Math.max(0, Math.min(3, lane))] - 1e-6) {
      const order = [lane - 1, lane + 1, lane - 2, lane + 2];
      const free = order.find(
        (candidate) =>
          candidate >= 0 &&
          candidate <= 3 &&
          note.beat >= busyUntil[candidate] - 1e-6,
      );
      if (free !== undefined) lane = free;
    }
    lane = Math.max(0, Math.min(3, lane));
    const hold = note.hold;
    if (hold) busyUntil[lane] = note.beat + hold + 0.2;
    else busyUntil[lane] = Math.max(busyUntil[lane], note.beat);
    out.push(
      hold
        ? { beat: note.beat, lane, dur: round4(hold) }
        : { beat: note.beat, lane },
    );
    lastLane = lane;
    lastBeat = note.beat;
    lastMidi = note.midi;
  }
  return out;
}

export function buildChart(
  track: RhythmTrack,
  difficulty: RhythmDifficulty,
): TrackChart {
  const config = CHART_CONFIGS[difficulty];
  // 第一遍：旋律音符全保留（量化 + 最小间隔）；较长的音转成长条
  const leads = track.events
    .filter((event) => event.t === 'lead')
    .map((event) => {
      const leadEvent = event as { beat: number; midi: number; dur: number };
      return {
        beat: round4(Math.round(leadEvent.beat / config.grid) * config.grid),
        midi: leadEvent.midi,
        hold: leadEvent.dur >= 1.75 ? Math.min(leadEvent.dur, 4) : undefined,
      };
    })
    .sort((a, b) => a.beat - b.beat);
  const picked: Array<{ beat: number; midi: number; hold?: number }> = [];
  let lastBeat = -Infinity;
  for (const note of leads) {
    if (note.beat - lastBeat < config.minGap - 1e-6) continue;
    picked.push(note);
    lastBeat = note.beat;
  }
  // 第二遍：用贝斯填充旋律的空隙，让谱面密度跟上鼓点
  if (config.bassFill !== 'none') {
    const bassEvents = track.events.filter(
      (event) => event.t === 'bass',
    ) as Array<{ beat: number; midi: number }>;
    const barBeats =
      config.bassFill === 'downbeat'
        ? bassEvents.filter((event) => Math.abs(event.beat % 4) < 1e-6)
        : bassEvents;
    for (const event of barBeats) {
      const beat = round4(event.beat);
      if (beat < 8) continue;
      const near = picked.some((note) => Math.abs(note.beat - beat) < config.minGap - 1e-6);
      if (near) continue;
      picked.push({ beat, midi: event.midi });
      lastBeat = Math.max(lastBeat, beat);
    }
  }
  picked.sort((a, b) => a.beat - b.beat);
  return {
    difficulty,
    label: DIFFICULTY_LABELS[difficulty],
    notes: assignLanes(picked),
  };
}

// ===== 谱面缓存与查找 =====

const chartCache = new Map<string, TrackChart>();

export function chartGameId(trackId: string, difficulty: RhythmDifficulty) {
  return `starbeat.${trackId}.${difficulty}`;
}

export function findRhythmChart(gameId: string): {
  track: RhythmTrack;
  chart: TrackChart;
} | null {
  const parts = gameId.split('.');
  if (parts.length !== 3 || parts[0] !== 'starbeat') return null;
  const [, trackId, difficulty] = parts;
  if (!DIFFICULTIES.includes(difficulty as RhythmDifficulty)) return null;
  const track = RHYTHM_TRACKS.find((item) => item.id === trackId);
  if (!track) return null;
  const cacheKey = gameId;
  let chart = chartCache.get(cacheKey);
  if (!chart) {
    chart = buildChart(track, difficulty as RhythmDifficulty);
    chartCache.set(cacheKey, chart);
  }
  return { track, chart };
}

// 供服务端 API 校验 game_id 白名单
export const RHYTHM_GAME_IDS: string[] = RHYTHM_TRACKS.flatMap((track) =>
  DIFFICULTIES.map((difficulty) => chartGameId(track.id, difficulty)),
);

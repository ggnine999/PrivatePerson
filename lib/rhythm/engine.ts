// 星屿音击：判定与计分核心（纯逻辑，无 DOM/DOM 无关，便于单测）。
//
// 计分：满分 1,000,000，每个音符按判定权重（PERFECT 1 / GREAT 0.65 / GOOD 0.3）
// 均摊分值，全 PERFECT 恰好满分；准确率与得分同源，排行榜按分数排序。

import type { ChartNote, RhythmTrack } from '@/lib/rhythm/tracks';

export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

// 判定窗口（毫秒）——面向博客读者的宽容档
export const JUDGE_WINDOWS_MS = { perfect: 55, great: 110, good: 160 } as const;

const WEIGHTS: Record<Judgment, number> = { perfect: 1, great: 0.65, good: 0.3, miss: 0 };

export type PlayNote = ChartNote & {
  time: number;
  state: 'pending' | 'hit' | 'missed';
  judgment?: Judgment;
  hitDelta?: number;
};

export type GameState = {
  laneNotes: PlayNote[][];
  lanePos: [number, number, number, number];
  totalNotes: number;
  judged: number;
  combo: number;
  maxCombo: number;
  counts: Record<Judgment, number>;
  score: number;
};

export type JudgeOutcome = {
  judgment: Judgment | null;
  deltaMs: number;
  note: PlayNote | null;
  score: number;
  combo: number;
};

export function createGame(
  chart: Pick<ChartNote, 'beat' | 'lane'>[],
  track: RhythmTrack,
): GameState {
  const spb = 60 / track.bpm;
  const laneNotes: PlayNote[][] = [[], [], [], []];
  for (const note of chart) {
    laneNotes[note.lane]?.push({
      beat: note.beat,
      lane: note.lane,
      time: note.beat * spb,
      state: 'pending',
    });
  }
  for (const lane of laneNotes) lane.sort((a, b) => a.time - b.time);
  const totalNotes = laneNotes.reduce((sum, lane) => sum + lane.length, 0);
  return {
    laneNotes,
    lanePos: [0, 0, 0, 0],
    totalNotes,
    judged: 0,
    combo: 0,
    maxCombo: 0,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    score: 0,
  };
}

/** 按键判定。返回 null 判定表示空挥（不惩罚，只给视觉反馈）。 */
export function judgeGame(
  state: GameState,
  lane: number,
  songTime: number,
  latencySec: number,
): JudgeOutcome {
  const arr = state.laneNotes[lane];
  if (!arr) return { judgment: null, deltaMs: 0, note: null, score: state.score, combo: state.combo };
  const goodSec = JUDGE_WINDOWS_MS.good / 1000;
  const hitTime = songTime - latencySec;
  let i = state.lanePos[lane];
  while (i < arr.length && arr[i].state !== 'pending') i += 1;
  state.lanePos[lane] = i;

  let best: PlayNote | null = null;
  let bestAbs = Infinity;
  for (let j = i; j < arr.length; j += 1) {
    const note = arr[j];
    if (note.time > hitTime + goodSec) break;
    if (note.state !== 'pending') continue;
    const abs = Math.abs(hitTime - note.time);
    if (abs <= goodSec && abs < bestAbs) {
      best = note;
      bestAbs = abs;
    }
  }
  if (!best) {
    return { judgment: null, deltaMs: 0, note: null, score: state.score, combo: state.combo };
  }

  const deltaMs = (hitTime - best.time) * 1000;
  let judgment: Judgment;
  if (bestAbs <= JUDGE_WINDOWS_MS.perfect / 1000) judgment = 'perfect';
  else if (bestAbs <= JUDGE_WINDOWS_MS.great / 1000) judgment = 'great';
  else judgment = 'good';

  best.state = 'hit';
  best.judgment = judgment;
  best.hitDelta = deltaMs;
  state.judged += 1;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.counts[judgment] += 1;
  state.score += (WEIGHTS[judgment] * 1_000_000) / state.totalNotes;
  return { judgment, deltaMs, note: best, score: state.score, combo: state.combo };
}

/** 每帧推进：把超出 GOOD 窗口仍未击中的音符标记为 MISS，返回本帧新漏掉的音符。 */
export function tickGame(state: GameState, songTime: number, latencySec: number): PlayNote[] {
  const goodSec = JUDGE_WINDOWS_MS.good / 1000;
  const hitTime = songTime - latencySec;
  const missed: PlayNote[] = [];
  for (let lane = 0; lane < 4; lane += 1) {
    const arr = state.laneNotes[lane];
    let i = state.lanePos[lane];
    while (i < arr.length && arr[i].state !== 'pending') i += 1;
    while (i < arr.length) {
      const note = arr[i];
      if (note.state !== 'pending') {
        i += 1;
        continue;
      }
      if (note.time >= hitTime - goodSec) break;
      note.state = 'missed';
      note.judgment = 'miss';
      state.judged += 1;
      state.combo = 0;
      state.counts.miss += 1;
      missed.push(note);
      i += 1;
    }
    state.lanePos[lane] = i;
  }
  return missed;
}

/** 准确率 0~1（按判定权重）。 */
export function accuracyOf(state: GameState): number {
  if (state.judged === 0) return 0;
  const sum =
    state.counts.perfect * WEIGHTS.perfect +
    state.counts.great * WEIGHTS.great +
    state.counts.good * WEIGHTS.good;
  return sum / state.judged;
}

export type Rating = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export function ratingOf(accuracy: number): Rating {
  if (accuracy >= 0.997) return 'SSS';
  if (accuracy >= 0.99) return 'SS';
  if (accuracy >= 0.95) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.8) return 'B';
  if (accuracy >= 0.7) return 'C';
  return 'D';
}

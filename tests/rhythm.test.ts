import { describe, expect, it } from 'vitest';
import {
  accuracyOf,
  createGame,
  judgeGame,
  ratingOf,
  tickGame,
} from '@/lib/rhythm/engine';
import {
  buildChart,
  DIFFICULTIES,
  findRhythmChart,
  RHYTHM_GAME_IDS,
  RHYTHM_TRACKS,
  chartGameId,
} from '@/lib/rhythm/tracks';

describe('rhythm tracks', () => {
  it('每首曲目都有三种难度的谱面，且 game id 可被反查', () => {
    expect(RHYTHM_TRACKS).toHaveLength(3);
    expect(RHYTHM_GAME_IDS).toHaveLength(9);
    for (const gameId of RHYTHM_GAME_IDS) {
      expect(findRhythmChart(gameId)).not.toBeNull();
    }
    expect(findRhythmChart('starbeat.unknown.easy')).toBeNull();
    expect(findRhythmChart('bogus')).toBeNull();
  });

  it('谱面是确定性生成的：同一谱面两次构建结果一致', () => {
    for (const track of RHYTHM_TRACKS) {
      for (const difficulty of DIFFICULTIES) {
        const a = buildChart(track, difficulty);
        const b = buildChart(track, difficulty);
        expect(a.notes).toEqual(b.notes);
      }
    }
  });

  it('谱面音符数量随难度递增，轨道全部使用且无同位重叠', () => {
    for (const track of RHYTHM_TRACKS) {
      const counts = DIFFICULTIES.map((difficulty) => {
        const chart = buildChart(track, difficulty);
        expect(chart.notes.length).toBeGreaterThan(40);
        const beats = new Set(chart.notes.map((note) => `${note.beat}:${note.lane}`));
        expect(beats.size).toBe(chart.notes.length);
        const lanes = new Set(chart.notes.map((note) => note.lane));
        expect(lanes.size).toBe(4);
        for (const note of chart.notes) {
          expect(note.lane).toBeGreaterThanOrEqual(0);
          expect(note.lane).toBeLessThanOrEqual(3);
          expect(Number.isInteger(note.lane)).toBe(true);
        }
        return chart.notes.length;
      });
      expect(counts[0]).toBeLessThan(counts[1]);
      expect(counts[1]).toBeLessThan(counts[2]);
    }
  });

  it('音符按时间升序排列', () => {
    for (const track of RHYTHM_TRACKS) {
      for (const difficulty of DIFFICULTIES) {
        const chart = buildChart(track, difficulty);
        for (let i = 1; i < chart.notes.length; i++) {
          expect(chart.notes[i].beat).toBeGreaterThanOrEqual(chart.notes[i - 1].beat);
        }
      }
    }
  });
});

describe('rhythm engine', () => {
  const track = RHYTHM_TRACKS[0];
  const chart = buildChart(track, 'normal');
  const spb = 60 / track.bpm;
  // 谱面音符只有 beat，没有 time（time 由 createGame 换算）
  const t = (note: { beat: number }) => note.beat * spb;

  it('全 PERFECT 恰好得满分 1,000,000', () => {
    const game = createGame(chart.notes, track);
    for (const note of chart.notes) {
      judgeGame(game, note.lane, t(note), 0);
    }
    expect(game.judged).toBe(game.totalNotes);
    expect(game.counts.miss).toBe(0);
    expect(Math.round(game.score)).toBe(1_000_000);
    expect(game.maxCombo).toBe(game.totalNotes);
    expect(accuracyOf(game)).toBeCloseTo(1, 6);
    expect(ratingOf(accuracyOf(game))).toBe('SSS');
  });

  it('完全不打则全部 MISS，得分为 0', () => {
    const game = createGame(chart.notes, track);
    const lastTime = t(chart.notes[chart.notes.length - 1]) + 2 * spb;
    tickGame(game, lastTime + 1, 0);
    expect(game.judged).toBe(game.totalNotes);
    expect(game.counts.miss).toBe(game.totalNotes);
    expect(game.score).toBe(0);
    expect(ratingOf(accuracyOf(game))).toBe('D');
  });

  it('MISS 会打断连击，重按不重复计分', () => {
    const game = createGame(chart.notes, track);
    const first = chart.notes[0];
    const second = chart.notes[1];
    const third = chart.notes[2];
    // 打中第一个
    judgeGame(game, first.lane, t(first), 0);
    expect(game.combo).toBe(1);
    // 第二个晚到超出窗口，被 tick 判 MISS
    tickGame(game, t(second) + 0.3, 0);
    expect(game.counts.miss).toBe(1);
    expect(game.combo).toBe(0);
    // 打中第三个，连击重新累计
    judgeGame(game, third.lane, t(third), 0);
    expect(game.combo).toBe(1);
    // 对已结算的音符重复判定不应计分
    const again = judgeGame(game, third.lane, t(third), 0);
    expect(again.judgment).toBeNull();
    expect(game.judged).toBe(3);
  });

  it('判定窗口边界：容差内命中，容差外不命中', () => {
    const game = createGame(chart.notes, track);
    const note = chart.notes[0];
    // 55ms 内为 PERFECT
    const perfect = judgeGame(game, note.lane, t(note) + 0.05, 0);
    expect(perfect.judgment).toBe('perfect');
    // 第二个音符偏 90ms 为 GREAT
    const second = chart.notes[1];
    const great = judgeGame(game, second.lane, t(second) + 0.09, 0);
    expect(great.judgment).toBe('great');
    // 第三个音符偏 140ms 为 GOOD
    const third = chart.notes[2];
    const good = judgeGame(game, third.lane, t(third) + 0.14, 0);
    expect(good.judgment).toBe('good');
  });

  it('输出延迟参与判定：声音晚 100ms 出来，时钟提前 50ms 按下仍是 PERFECT', () => {
    const game = createGame(chart.notes, track);
    const note = chart.notes[0];
    // hitTime = songTime - latency = t(note) + 0.05 - 0.1 = t(note) - 0.05
    const outcome = judgeGame(game, note.lane, t(note) + 0.05, 0.1);
    expect(outcome.judgment).toBe('perfect');
  });

  it('game id 与谱面一一对应', () => {
    const gameId = chartGameId(track.id, 'hard');
    const found = findRhythmChart(gameId);
    expect(found?.track.id).toBe(track.id);
    expect(found?.chart.difficulty).toBe('hard');
    expect(found?.chart.notes.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { validateGameScoreSubmission } from '@/lib/game-score-policy';

describe('game score submission policy', () => {
  const notes = 120;

  it('accepts a bounded, internally plausible client score', () => {
    expect(
      validateGameScoreSubmission(
        { score: 765_000, accuracy: 8125, maxCombo: 47 },
        notes,
      ),
    ).toEqual({ score: 765_000, accuracy: 8125, maxCombo: 47 });
  });

  it.each([
    { score: 1_000_001, accuracy: 10_000, maxCombo: notes },
    { score: 10, accuracy: 9000, maxCombo: notes + 1 },
    { score: 1.5, accuracy: 9000, maxCombo: 10 },
    { score: 1_000_000, accuracy: 9999, maxCombo: notes },
    { score: 1_000_000, accuracy: 10_000, maxCombo: notes - 1 },
    { score: 0, accuracy: 1, maxCombo: 0 },
  ])('rejects impossible or malformed score %#', (score) => {
    expect(validateGameScoreSubmission(score, notes)).toBeNull();
  });
});

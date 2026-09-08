export const MAX_GAME_SCORE = 1_000_000;

export type ValidGameScore = {
  score: number;
  accuracy: number;
  maxCombo: number;
};

export function validateGameScoreSubmission(
  input: Record<string, unknown>,
  noteCount: number,
): ValidGameScore | null {
  const score = input.score;
  const accuracy = input.accuracy;
  const maxCombo = input.maxCombo;
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(accuracy) ||
    !Number.isInteger(maxCombo) ||
    (score as number) < 0 ||
    (score as number) > MAX_GAME_SCORE ||
    (accuracy as number) < 0 ||
    (accuracy as number) > 10_000 ||
    (maxCombo as number) < 0 ||
    (maxCombo as number) > noteCount
  ) {
    return null;
  }

  if (
    ((score === MAX_GAME_SCORE || accuracy === 10_000) &&
      (score !== MAX_GAME_SCORE ||
        accuracy !== 10_000 ||
        maxCombo !== noteCount)) ||
    (score === 0 && accuracy !== 0)
  ) {
    return null;
  }

  return { score, accuracy, maxCombo } as ValidGameScore;
}

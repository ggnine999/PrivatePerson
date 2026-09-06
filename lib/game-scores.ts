import { env } from 'cloudflare:workers';
import { randomToken } from '@/lib/security';

export type GameScoreRow = {
  id: string;
  gameId: string;
  username: string;
  score: number;
  /** 准确率，万分比（0~10000） */
  accuracy: number;
  maxCombo: number;
  createdAt: number;
};

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

function mapScore(row: {
  id: string;
  game_id: string;
  username: string;
  score: number;
  accuracy: number;
  max_combo: number;
  created_at: number;
}): GameScoreRow {
  return {
    id: row.id,
    gameId: row.game_id,
    username: row.username,
    score: row.score,
    accuracy: row.accuracy,
    maxCombo: row.max_combo,
    createdAt: row.created_at,
  };
}

export async function listTopScores(
  gameId: string,
  limit = 20,
): Promise<GameScoreRow[]> {
  const result = await db()
    .prepare(
      `SELECT id, game_id, username, score, accuracy, max_combo, created_at
       FROM game_scores
       WHERE game_id = ?
       ORDER BY score DESC, created_at ASC
       LIMIT ?`,
    )
    .bind(gameId, limit)
    .all<{
      id: string;
      game_id: string;
      username: string;
      score: number;
      accuracy: number;
      max_combo: number;
      created_at: number;
    }>();
  return (result.results ?? []).map(mapScore);
}

export async function getUserBestScore(
  gameId: string,
  userId: string,
): Promise<GameScoreRow | null> {
  const row = await db()
    .prepare(
      `SELECT id, game_id, username, score, accuracy, max_combo, created_at
       FROM game_scores
       WHERE game_id = ? AND user_id = ?`,
    )
    .bind(gameId, userId)
    .first<{
      id: string;
      game_id: string;
      username: string;
      score: number;
      accuracy: number;
      max_combo: number;
      created_at: number;
    }>();
  return row ? mapScore(row) : null;
}

// 每人每个谱面只保留历史最高分；返回 true 表示刷新了纪录（首次上榜或超越旧成绩）。
export async function upsertGameScore(input: {
  gameId: string;
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  maxCombo: number;
}): Promise<boolean> {
  const result = await db()
    .prepare(
      `INSERT INTO game_scores
         (id, game_id, user_id, username, score, accuracy, max_combo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(game_id, user_id) DO UPDATE SET
         username = excluded.username,
         score = excluded.score,
         accuracy = excluded.accuracy,
         max_combo = excluded.max_combo,
         created_at = excluded.created_at
       WHERE excluded.score > game_scores.score`,
    )
    .bind(
      randomToken(),
      input.gameId,
      input.userId,
      input.username,
      input.score,
      input.accuracy,
      input.maxCombo,
      Date.now(),
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

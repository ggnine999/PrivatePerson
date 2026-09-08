import { NextResponse } from 'next/server';
import {
  cleanCommunityText,
  getCommunitySessionUser,
  requireCommunityUser,
} from '@/lib/community-auth';
import {
  getUserBestScore,
  listTopScores,
  upsertGameScore,
} from '@/lib/game-scores';
import { consumeRateLimit } from '@/lib/rate-limit';
import { clientKey } from '@/lib/server-auth';
import { findRhythmChart } from '@/lib/rhythm/tracks';
import { validateGameScoreSubmission } from '@/lib/game-score-policy';

// 游戏排行榜：GET 公开读榜（顺带给登录态）；POST 登录用户提交成绩，
// 每人每个谱面只保留历史最高分。
const SUBMIT_LIMIT = 12;
const SUBMIT_WINDOW_MS = 10 * 60_000;

export async function GET(request: Request) {
  const gameId = new URL(request.url).searchParams.get('game') ?? '';
  if (!findRhythmChart(gameId)) {
    return NextResponse.json({ error: '谱面不存在' }, { status: 404 });
  }
  const viewer = await getCommunitySessionUser();
  const [scores, personalBest] = await Promise.all([
    listTopScores(gameId, 20),
    viewer ? getUserBestScore(gameId, viewer.id) : Promise.resolve(null),
  ]);
  return NextResponse.json(
    {
      scores,
      canSubmit: Boolean(viewer),
      csrfToken: viewer?.csrfToken ?? null,
      personalBest,
      trust: { verified: false, basis: 'client-reported' },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const member = await requireCommunityUser(request, true);
  if (!member) {
    return NextResponse.json(
      { error: '请先登录后再提交成绩' },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const gameId = typeof input.gameId === 'string' ? input.gameId : '';
  const selected = findRhythmChart(gameId);
  if (!selected) {
    return NextResponse.json({ error: '谱面不存在' }, { status: 400 });
  }
  const scoreData = validateGameScoreSubmission(
    input,
    selected.chart.notes.length,
  );
  if (!scoreData) {
    return NextResponse.json({ error: '成绩数据不合法' }, { status: 400 });
  }
  const key = await clientKey();
  if (
    !(await consumeRateLimit('game-score', key, SUBMIT_LIMIT, SUBMIT_WINDOW_MS))
  ) {
    return NextResponse.json(
      { error: '提交太频繁，请稍后再试' },
      { status: 429 },
    );
  }
  const recorded = await upsertGameScore({
    gameId,
    userId: member.id,
    username: cleanCommunityText(member.displayName, 20) || member.username,
    ...scoreData,
  });
  return NextResponse.json({
    ok: true,
    recorded,
    trust: { verified: false, basis: 'client-reported' },
  });
}

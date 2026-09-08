import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  articleInteractionId: vi.fn(),
  clientKey: vi.fn(),
  consumeRateLimit: vi.fn(),
  countPublishedCommentsByUser: vi.fn(),
  createArticleComment: vi.fn(),
  createSiteMessage: vi.fn(),
  getArticleBySlug: vi.fn(),
  getCommunitySessionUser: vi.fn(),
  listArticleComments: vi.fn(),
  listSiteMessages: vi.fn(),
  requireCommunityUser: vi.fn(),
  setArticleLike: vi.fn(),
  upsertGameScore: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));
vi.mock('@/lib/article-interaction', () => ({
  articleInteractionId: mocks.articleInteractionId,
}));
vi.mock('@/lib/article-stats', () => ({
  setArticleLike: mocks.setArticleLike,
}));
vi.mock('@/lib/server-auth', () => ({ clientKey: mocks.clientKey }));
vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock('@/lib/community-auth', () => ({
  cleanCommunityText: (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '',
  countPublishedCommentsByUser: mocks.countPublishedCommentsByUser,
  getCommunitySessionUser: mocks.getCommunitySessionUser,
  requireCommunityUser: mocks.requireCommunityUser,
}));
vi.mock('@/lib/community-store', () => ({
  commentBelongsToSlug: vi.fn().mockResolvedValue(true),
  createArticleComment: mocks.createArticleComment,
  createSiteMessage: mocks.createSiteMessage,
  listArticleComments: mocks.listArticleComments,
  listSiteMessages: mocks.listSiteMessages,
}));
vi.mock('@/lib/site-content', () => ({
  getArticleBySlug: mocks.getArticleBySlug,
}));
vi.mock('@/lib/game-scores', () => ({
  getUserBestScore: vi.fn().mockResolvedValue(null),
  listTopScores: vi.fn().mockResolvedValue([]),
  upsertGameScore: mocks.upsertGameScore,
}));

import { POST as postComment } from '@/app/api/community/comments/route';
import { POST as postMessage } from '@/app/api/community/messages/route';
import { POST as postScore } from '@/app/api/game/scores/route';
import { POST as postLike } from '@/app/api/article-stats/like/route';

function jsonRequest(url: string, body: unknown, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('content-type', 'application/json');
  return new Request(url, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clientKey.mockResolvedValue('client-key');
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.articleInteractionId.mockResolvedValue('interaction-id');
  mocks.getArticleBySlug.mockResolvedValue({ slug: 'hello' });
  mocks.countPublishedCommentsByUser.mockResolvedValue(0);
  mocks.getCommunitySessionUser.mockResolvedValue({
    id: 'member-1',
    username: 'member',
    displayName: '新成员',
  });
});

describe('community API moderation', () => {
  it('keeps a new member comment pending', async () => {
    const response = await postComment(
      jsonRequest('http://localhost/api/community/comments', {
        slug: 'hello',
        content: '这是一条新成员评论',
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'pending' });
    expect(mocks.createArticleComment).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', authorUserId: 'member-1' }),
    );
  });

  it('publishes only after three approved comments', async () => {
    mocks.countPublishedCommentsByUser.mockResolvedValue(3);
    const response = await postMessage(
      jsonRequest('http://localhost/api/community/messages', {
        content: '可信成员留言',
      }),
    );
    expect(await response.json()).toMatchObject({ status: 'published' });
    expect(mocks.createSiteMessage).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
  });
});

describe('score and article interaction APIs', () => {
  it('rejects a combo larger than the selected chart', async () => {
    mocks.requireCommunityUser.mockResolvedValue({
      id: 'member-1',
      username: 'member',
      displayName: '玩家',
    });
    const response = await postScore(
      jsonRequest(
        'http://localhost/api/game/scores',
        {
          gameId: 'starbeat.first-snow.easy',
          score: 900_000,
          accuracy: 9000,
          maxCombo: 10_000,
        },
        { 'x-community-csrf': 'token' },
      ),
    );
    expect(response.status).toBe(400);
    expect(mocks.upsertGameScore).not.toHaveBeenCalled();
  });

  it('rejects legacy like deltas and accepts an explicit boolean state', async () => {
    const invalid = await postLike(
      jsonRequest('http://localhost/api/article-stats/like', {
        slug: 'hello',
        delta: 1,
      }),
    );
    expect(invalid.status).toBe(400);

    mocks.setArticleLike.mockResolvedValue({
      stats: { views: 10, likes: 2 },
      liked: true,
    });
    const valid = await postLike(
      jsonRequest('http://localhost/api/article-stats/like', {
        slug: 'hello',
        liked: true,
      }),
    );
    expect(valid.status).toBe(200);
    expect(mocks.setArticleLike).toHaveBeenCalledWith(
      'hello',
      'interaction-id',
      true,
    );
  });
});

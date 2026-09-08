import { describe, expect, it } from 'vitest';
import { articleInteractionId, utcDay } from '@/lib/article-interaction';

describe('article interaction identity', () => {
  it('uses a daily bucket for views', async () => {
    const morning = Date.UTC(2026, 8, 7, 1);
    const evening = Date.UTC(2026, 8, 7, 22);
    const nextDay = Date.UTC(2026, 8, 8, 1);
    const first = await articleInteractionId(
      'view',
      'hello',
      'client',
      morning,
    );
    expect(await articleInteractionId('view', 'hello', 'client', evening)).toBe(
      first,
    );
    expect(
      await articleInteractionId('view', 'hello', 'client', nextDay),
    ).not.toBe(first);
    expect(utcDay(morning)).toBe('2026-09-07');
  });

  it('keeps likes stable across dates and isolates slugs and clients', async () => {
    const first = await articleInteractionId('like', 'hello', 'client', 0);
    expect(
      await articleInteractionId('like', 'hello', 'client', Date.now()),
    ).toBe(first);
    expect(await articleInteractionId('like', 'other', 'client', 0)).not.toBe(
      first,
    );
    expect(await articleInteractionId('like', 'hello', 'other', 0)).not.toBe(
      first,
    );
  });
});

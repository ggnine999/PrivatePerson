import { describe, expect, it } from 'vitest';
import { isAttemptAllowed } from '@/lib/rate-limit-policy';

describe('rate limit boundaries', () => {
  it('allows requests through the configured limit', () => {
    expect(isAttemptAllowed(1, 5)).toBe(true);
    expect(isAttemptAllowed(5, 5)).toBe(true);
    expect(isAttemptAllowed(30, 30)).toBe(true);
  });

  it('blocks the next request and malformed counters', () => {
    expect(isAttemptAllowed(6, 5)).toBe(false);
    expect(isAttemptAllowed(31, 30)).toBe(false);
    expect(isAttemptAllowed(0, 5)).toBe(false);
    expect(isAttemptAllowed(Number.NaN, 5)).toBe(false);
  });
});

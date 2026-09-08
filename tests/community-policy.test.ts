import { describe, expect, it } from 'vitest';
import {
  communityContentStatus,
  TRUSTED_MEMBER_PUBLISHED_COMMENT_COUNT,
} from '@/lib/community-policy';

describe('community moderation policy', () => {
  it('keeps new and low-trust members in moderation', () => {
    expect(communityContentStatus(0)).toBe('pending');
    expect(
      communityContentStatus(TRUSTED_MEMBER_PUBLISHED_COMMENT_COUNT - 1),
    ).toBe('pending');
  });

  it('allows automatic publication only after the trust threshold', () => {
    expect(communityContentStatus(TRUSTED_MEMBER_PUBLISHED_COMMENT_COUNT)).toBe(
      'published',
    );
  });
});

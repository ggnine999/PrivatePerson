export const TRUSTED_MEMBER_PUBLISHED_COMMENT_COUNT = 3;

export function communityContentStatus(publishedCommentCount: number) {
  return publishedCommentCount >= TRUSTED_MEMBER_PUBLISHED_COMMENT_COUNT
    ? ('published' as const)
    : ('pending' as const);
}

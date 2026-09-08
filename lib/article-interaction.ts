import { sha256 } from '@/lib/security';

export type ArticleInteractionKind = 'view' | 'like';

export function utcDay(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function articleInteractionId(
  kind: ArticleInteractionKind,
  slug: string,
  anonymousClientKey: string,
  timestamp = Date.now(),
) {
  const timeBucket = kind === 'view' ? utcDay(timestamp) : 'persistent';
  return sha256(
    ['article-interaction-v1', kind, slug, timeBucket, anonymousClientKey].join(
      '\0',
    ),
  );
}

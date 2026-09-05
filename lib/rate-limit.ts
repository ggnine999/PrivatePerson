import { env } from 'cloudflare:workers';
import { isAttemptAllowed } from '@/lib/rate-limit-policy';

function db() {
  if (!env.DB) throw new Error('DB binding unavailable');
  return env.DB;
}

export async function consumeRateLimit(
  scope: string,
  clientKey: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const row = await db()
    .prepare(
      `INSERT INTO request_rate_limits
         (scope, client_key, window_start, attempts)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(scope, client_key) DO UPDATE SET
         window_start = CASE
           WHEN request_rate_limits.window_start <= ? THEN excluded.window_start
           ELSE request_rate_limits.window_start
         END,
         attempts = CASE
           WHEN request_rate_limits.window_start <= ? THEN 1
           ELSE request_rate_limits.attempts + 1
         END
       RETURNING attempts`,
    )
    .bind(scope, clientKey, now, cutoff, cutoff)
    .first<{ attempts: number }>();

  return Boolean(row && isAttemptAllowed(row.attempts, limit));
}

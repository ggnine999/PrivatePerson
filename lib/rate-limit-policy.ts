export function isAttemptAllowed(attempts: number, limit: number) {
  return (
    Number.isInteger(attempts) &&
    Number.isInteger(limit) &&
    attempts >= 1 &&
    limit >= 1 &&
    attempts <= limit
  );
}

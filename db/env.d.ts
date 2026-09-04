declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    OWNER_LOGIN?: string;
    OWNER_PASSWORD_HASH?: string;
    OWNER_TOTP_SECRET?: string;
    SESSION_TTL_MINUTES?: string;
  }
}

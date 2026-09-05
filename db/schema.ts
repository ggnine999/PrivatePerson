import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const vaultProfiles = sqliteTable('vault_profiles', {
  id: text('id').primaryKey(),
  salt: text('salt').notNull(),
  verifierIv: text('verifier_iv').notNull(),
  verifierCiphertext: text('verifier_ciphertext').notNull(),
  kdfIterations: integer('kdf_iterations').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const vaultRecords = sqliteTable(
  'vault_records',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['account', 'apiKey'] }).notNull(),
    platform: text('platform').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(),
    tags: text('tags').notNull(),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    environment: text('environment'),
    expiresAt: text('expires_at'),
    rotateAt: text('rotate_at'),
    secretSuffix: text('secret_suffix').notNull().default(''),
    ciphertext: text('ciphertext').notNull(),
    iv: text('iv').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_vault_records_type_updated').on(table.type, table.updatedAt),
  ],
);

export const ownerSessions = sqliteTable(
  'owner_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_owner_sessions_expires').on(table.expiresAt)],
);

export const loginAttempts = sqliteTable('login_attempts', {
  clientKey: text('client_key').primaryKey(),
  windowStart: integer('window_start').notNull(),
  attempts: integer('attempts').notNull(),
});

export const requestRateLimits = sqliteTable(
  'request_rate_limits',
  {
    scope: text('scope').notNull(),
    clientKey: text('client_key').notNull(),
    windowStart: integer('window_start').notNull(),
    attempts: integer('attempts').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.scope, table.clientKey],
      name: 'request_rate_limits_scope_client_key_pk',
    }),
  ],
);

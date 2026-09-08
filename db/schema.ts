import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
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
    userId: text('user_id'),
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

/* ===== 社区系统：与保险库完全独立的账号、会话与内容表 ===== */

export const communityUsers = sqliteTable(
  'community_users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    avatar: text('avatar'),
    bio: text('bio'),
    permission: integer('permission').$type<0 | 1>().notNull().default(0),
    status: text('status', { enum: ['active', 'banned'] })
      .notNull()
      .default('active'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_community_users_created').on(table.createdAt)],
);

export const communitySessions = sqliteTable(
  'community_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => communityUsers.id),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_community_sessions_expires').on(table.expiresAt),
    index('idx_community_sessions_user').on(table.userId),
  ],
);

export const articleComments = sqliteTable(
  'article_comments',
  {
    id: text('id').primaryKey(),
    articleSlug: text('article_slug').notNull(),
    parentId: text('parent_id'),
    authorType: text('author_type', { enum: ['member', 'guest'] }).notNull(),
    authorUserId: text('author_user_id'),
    authorName: text('author_name').notNull(),
    content: text('content').notNull(),
    status: text('status', { enum: ['published', 'pending'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_article_comments_slug').on(
      table.articleSlug,
      table.status,
      table.createdAt,
    ),
  ],
);

export const siteMessages = sqliteTable(
  'site_messages',
  {
    id: text('id').primaryKey(),
    authorType: text('author_type', { enum: ['member', 'guest'] }).notNull(),
    authorUserId: text('author_user_id'),
    authorName: text('author_name').notNull(),
    content: text('content').notNull(),
    status: text('status', { enum: ['published', 'pending'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_site_messages_status').on(table.status, table.createdAt),
  ],
);

export const friendLinks = sqliteTable('friend_links', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description').notNull().default(''),
  rssUrl: text('rss_url'),
  status: text('status', { enum: ['approved', 'pending'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const articleStats = sqliteTable('article_stats', {
  slug: text('slug').primaryKey(),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(0),
});

export const articleViewEvents = sqliteTable(
  'article_view_events',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_article_view_events_slug').on(table.slug),
    index('idx_article_view_events_created').on(table.createdAt),
  ],
);

export const articleLikeEvents = sqliteTable(
  'article_like_events',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_article_like_events_slug').on(table.slug)],
);

export const moments = sqliteTable(
  'moments',
  {
    id: text('id').primaryKey(),
    content: text('content').notNull(),
    status: text('status', { enum: ['published', 'draft'] })
      .notNull()
      .default('published'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_moments_created').on(table.createdAt)],
);

export const friendPosts = sqliteTable(
  'friend_posts',
  {
    id: text('id').primaryKey(),
    friendId: text('friend_id').notNull(),
    title: text('title').notNull(),
    link: text('link').notNull(),
    publishedAt: integer('published_at').notNull(),
    fetchedAt: integer('fetched_at').notNull(),
  },
  (table) => [index('idx_friend_posts_published').on(table.publishedAt)],
);

export const gameScores = sqliteTable(
  'game_scores',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull(),
    userId: text('user_id').notNull(),
    username: text('username').notNull(),
    score: integer('score').notNull(),
    accuracy: integer('accuracy').notNull(),
    maxCombo: integer('max_combo').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_game_scores_user_board').on(table.gameId, table.userId),
    index('idx_game_scores_board').on(table.gameId, table.score),
  ],
);

export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    tags: text('tags').notNull(),
    publishedAt: text('published_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    readingMinutes: integer('reading_minutes').notNull(),
    featured: integer('featured', { mode: 'boolean' }).notNull(),
    status: text('status', { enum: ['published', 'draft'] })
      .notNull()
      .default('published'),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
    modifiedAt: integer('modified_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_articles_slug').on(table.slug),
    index('idx_articles_published').on(table.publishedAt),
  ],
);

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    tech: text('tech').notNull(),
    status: text('status').notNull(),
    website: text('website').notNull(),
    repository: text('repository'),
    featured: integer('featured', { mode: 'boolean' }).notNull(),
    mark: text('mark').notNull(),
    createdAt: integer('created_at').notNull(),
    modifiedAt: integer('modified_at').notNull(),
  },
  (table) => [uniqueIndex('idx_projects_slug').on(table.slug)],
);

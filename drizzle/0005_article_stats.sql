-- 文章阅读量与点赞计数（P0 数据闭环）
CREATE TABLE article_stats (
  slug TEXT PRIMARY KEY NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

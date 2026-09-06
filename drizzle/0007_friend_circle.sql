-- 友链朋友圈：友链 RSS 订阅地址 + 聚合的朋友文章（P3）
ALTER TABLE `friend_links` ADD `rss_url` text;
--> statement-breakpoint
CREATE TABLE `friend_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`friend_id` text NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`published_at` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_friend_posts_published` ON `friend_posts` (`published_at`);

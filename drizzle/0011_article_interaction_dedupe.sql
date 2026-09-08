CREATE TABLE `article_like_events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_article_like_events_slug` ON `article_like_events` (`slug`);--> statement-breakpoint
CREATE TABLE `article_view_events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_article_view_events_slug` ON `article_view_events` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_article_view_events_created` ON `article_view_events` (`created_at`);
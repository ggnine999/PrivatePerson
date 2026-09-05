CREATE TABLE `article_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`article_slug` text NOT NULL,
	`parent_id` text,
	`author_type` text NOT NULL,
	`author_user_id` text,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_article_comments_slug` ON `article_comments` (`article_slug`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `community_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_sessions_expires` ON `community_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_community_sessions_user` ON `community_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `community_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar` text,
	`bio` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_users_username_unique` ON `community_users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_community_users_created` ON `community_users` (`created_at`);--> statement-breakpoint
CREATE TABLE `friend_links` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`author_type` text NOT NULL,
	`author_user_id` text,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_site_messages_status` ON `site_messages` (`status`,`created_at`);
-- 说说：站主发布的短内容时间线（P1 社区氛围）
CREATE TABLE `moments` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_moments_created` ON `moments` (`created_at`);

ALTER TABLE `community_users` ADD `permission` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_sessions` ADD `user_id` text;
-- 游戏排行榜：社区登录用户在各个游戏谱面上的历史最高分（游戏栏目）
CREATE TABLE `game_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`score` integer NOT NULL,
	`accuracy` integer NOT NULL,
	`max_combo` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_scores_user_board` ON `game_scores` (`game_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `idx_game_scores_board` ON `game_scores` (`game_id`, `score`);

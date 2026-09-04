CREATE TABLE `login_attempts` (
	`client_key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`csrf_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`verifier_iv` text NOT NULL,
	`verifier_ciphertext` text NOT NULL,
	`kdf_iterations` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault_records` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`platform` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`environment` text,
	`expires_at` text,
	`rotate_at` text,
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE INDEX `idx_owner_sessions_expires` ON `owner_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_vault_records_type_updated` ON `vault_records` (`type`,`updated_at`);
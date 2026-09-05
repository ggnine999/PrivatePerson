CREATE TABLE `request_rate_limits` (
	`scope` text NOT NULL,
	`client_key` text NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`scope`, `client_key`)
);

CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`white_token` text NOT NULL,
	`black_token` text,
	`fen` text NOT NULL,
	`moves_json` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

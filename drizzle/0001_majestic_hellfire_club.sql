ALTER TABLE `rooms` ADD `white_name` text DEFAULT 'Kỳ thủ Trắng' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `black_name` text DEFAULT 'Kỳ thủ Đen' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `total_seconds` integer DEFAULT 900 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `move_limit_seconds` integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `white_remaining_ms` integer DEFAULT 900000 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `black_remaining_ms` integer DEFAULT 900000 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `turn_started_at` integer;--> statement-breakpoint
ALTER TABLE `rooms` ADD `end_reason` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `draw_offer` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `white_seen_at` integer;--> statement-breakpoint
ALTER TABLE `rooms` ADD `black_seen_at` integer;
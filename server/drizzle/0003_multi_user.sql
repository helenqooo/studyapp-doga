CREATE TABLE `auth_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_tokens_user_idx` ON `auth_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_streak_date` text,
	`badges` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{"focusMinutes":25,"breakMinutes":5}' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar` text DEFAULT 'clay' NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `xp_events_user_date_idx` ON `xp_events` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `xp_events_date_idx` ON `xp_events` (`date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_weekly_summaries` (
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`created_at` integer NOT NULL,
	`summary` text NOT NULL,
	`priorities` text NOT NULL,
	PRIMARY KEY(`user_id`, `week_start`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Weekly summaries were a single-user cache; they regenerate per user on demand.
DROP TABLE `weekly_summaries`;--> statement-breakpoint
ALTER TABLE `__new_weekly_summaries` RENAME TO `weekly_summaries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `attempts` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `attempts_user_created_idx` ON `attempts` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `exams` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `exams_user_date_idx` ON `exams` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `questions` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `questions_user_created_idx` ON `questions` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `reviews` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `reviews_user_due_idx` ON `reviews` (`user_id`,`status`,`due_date`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `sessions_user_date_idx` ON `sessions` (`user_id`,`date`);
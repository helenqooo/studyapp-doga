CREATE TABLE `weekly_summaries` (
	`week_start` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`summary` text NOT NULL,
	`priorities` text NOT NULL
);

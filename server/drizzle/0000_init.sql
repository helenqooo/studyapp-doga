CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`source` text NOT NULL,
	`result` text NOT NULL,
	`user_answer` text,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`viewed_solution` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_question_idx` ON `attempts` (`question_id`);--> statement-breakpoint
CREATE INDEX `attempts_created_at_idx` ON `attempts` (`created_at`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`date` text NOT NULL,
	`exam` text NOT NULL,
	`name` text,
	`sections` text NOT NULL,
	`image_file` text
);
--> statement-breakpoint
CREATE INDEX `exams_date_idx` ON `exams` (`date`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_streak_date` text,
	`badges` text DEFAULT '[]' NOT NULL,
	`settings` text DEFAULT '{"focusMinutes":25,"breakMinutes":5}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`image_file` text NOT NULL,
	`image_mime` text NOT NULL,
	`exam` text NOT NULL,
	`subject` text NOT NULL,
	`topic_id` text NOT NULL,
	`difficulty` integer NOT NULL,
	`question_text` text NOT NULL,
	`hints` text NOT NULL,
	`solution_steps` text NOT NULL,
	`final_answer` text NOT NULL,
	`confidence` real NOT NULL,
	`model` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `questions_created_at_idx` ON `questions` (`created_at`);--> statement-breakpoint
CREATE INDEX `questions_subject_topic_idx` ON `questions` (`subject`,`topic_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`question_id` text PRIMARY KEY NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`last_result` text,
	`last_reviewed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_due_idx` ON `reviews` (`status`,`due_date`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`subject` text,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`completed` integer NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_date_idx` ON `sessions` (`date`);
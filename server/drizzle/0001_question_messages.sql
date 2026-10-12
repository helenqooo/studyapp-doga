CREATE TABLE `question_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `question_messages_question_idx` ON `question_messages` (`question_id`,`created_at`);
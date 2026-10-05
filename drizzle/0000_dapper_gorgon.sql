CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problem_id` text NOT NULL,
	`kind` text NOT NULL,
	`activity_date` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activities_date_kind` ON `activities` (`activity_date`,`kind`);--> statement-breakpoint
CREATE TABLE `custom_problems` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`problem_id` text PRIMARY KEY NOT NULL,
	`solved` integer DEFAULT false NOT NULL,
	`mastery` integer DEFAULT 0 NOT NULL,
	`due_at` integer,
	`last_reviewed_at` integer,
	`review_count` integer DEFAULT 0 NOT NULL
);

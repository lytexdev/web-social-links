CREATE TABLE `reference_docs` (
	`slug` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`kind` text NOT NULL,
	`published` text,
	`hash` text NOT NULL,
	`doc` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reference_docs_published_idx` ON `reference_docs` (`published`);
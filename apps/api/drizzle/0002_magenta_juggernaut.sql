CREATE TABLE `password_reset_challenges` (
	`id` char(36) NOT NULL,
	`email` varchar(200) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `password_reset_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `password_reset_email_idx` ON `password_reset_challenges` (`email`);
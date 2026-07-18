CREATE TABLE `buildings` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaint_attachments` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`complaint_id` char(36) NOT NULL,
	`content_kind` enum('image','video') NOT NULL,
	`content_type` varchar(120) NOT NULL,
	`blob_path` varchar(500) NOT NULL,
	`byte_size` int NOT NULL,
	`duration_seconds` int,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `complaint_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`ticket_number` varchar(32) NOT NULL,
	`title` varchar(200) NOT NULL,
	`type` enum('electric','plumbing','housekeeping','security','lift','other') NOT NULL,
	`type_other_text` varchar(120),
	`description` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`flat_id` char(36) NOT NULL,
	`raised_by_user_id` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_tenant_ticket_uidx` UNIQUE(`tenant_id`,`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `flats` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`wing_id` char(36) NOT NULL,
	`number` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `flats_id` PRIMARY KEY(`id`),
	CONSTRAINT `flats_tenant_number_uidx` UNIQUE(`tenant_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` char(36) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`attempts` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `otp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `residents` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`flat_id` char(36) NOT NULL,
	`is_owner` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `residents_id` PRIMARY KEY(`id`),
	CONSTRAINT `residents_tenant_user_uidx` UNIQUE(`tenant_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `societies` (
	`id` char(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`address` varchar(500),
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `societies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` enum('admin','resident') NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_tenant_user_role_uidx` UNIQUE(`tenant_id`,`user_id`,`role`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`phone` varchar(20),
	`email` varchar(200),
	`name` varchar(120),
	`google_sub` varchar(128),
	`pin_hash` varchar(255),
	`pin_updated_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_uidx` UNIQUE(`phone`),
	CONSTRAINT `users_email_uidx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `wings` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`building_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `wings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `buildings_tenant_idx` ON `buildings` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `attachments_complaint_idx` ON `complaint_attachments` (`complaint_id`);--> statement-breakpoint
CREATE INDEX `complaints_tenant_status_idx` ON `complaints` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `flats_tenant_idx` ON `flats` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otp_challenges` (`phone`);--> statement-breakpoint
CREATE INDEX `refresh_user_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `residents_tenant_idx` ON `residents` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `user_roles_tenant_user_idx` ON `user_roles` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `wings_tenant_idx` ON `wings` (`tenant_id`);
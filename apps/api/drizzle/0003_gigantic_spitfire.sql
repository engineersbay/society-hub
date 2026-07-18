CREATE TABLE IF NOT EXISTS `assets` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(80),
	`location` varchar(200),
	`purchase_date` datetime(3),
	`value_paise` int,
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`actor_user_id` char(36) NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` char(36) NOT NULL,
	`meta` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bill_line_items` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`bill_id` char(36) NOT NULL,
	`label` varchar(200) NOT NULL,
	`amount_paise` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `bill_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bills` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`flat_id` char(36) NOT NULL,
	`period_ym` varchar(7) NOT NULL,
	`amount_paise` int NOT NULL,
	`status` enum('draft','issued','paid','void','corrected') NOT NULL DEFAULT 'draft',
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `bills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bookings` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`facility_name` varchar(120) NOT NULL,
	`flat_id` char(36) NOT NULL,
	`booked_by_user_id` char(36) NOT NULL,
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `complaint_comments` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`complaint_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `complaint_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `complaint_status_events` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`complaint_id` char(36) NOT NULL,
	`from_status` varchar(32),
	`to_status` varchar(32) NOT NULL,
	`actor_user_id` char(36) NOT NULL,
	`note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `complaint_status_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`start_at` datetime(3),
	`end_at` datetime(3),
	`location` varchar(200),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invitations` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`email` varchar(200),
	`phone` varchar(20),
	`role` enum('admin','resident','superadmin') NOT NULL,
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`invited_by` char(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_uidx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notice_reads` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`notice_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`read_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notice_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `notice_reads_notice_user_uidx` UNIQUE(`notice_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notices` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`audience` enum('all','wing','flat') NOT NULL DEFAULT 'all',
	`wing_id` char(36),
	`flat_id` char(36),
	`published_at` datetime(3),
	`unpublished_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notifications` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`kind` varchar(40) NOT NULL DEFAULT 'general',
	`read_at` datetime(3),
	`link_path` varchar(300),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_slots` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`flat_id` char(36),
	`slot_number` varchar(32) NOT NULL,
	`vehicle_number` varchar(32),
	`type` varchar(32) NOT NULL DEFAULT 'car',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `parking_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payments` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`bill_id` char(36),
	`flat_id` char(36) NOT NULL,
	`amount_paise` int NOT NULL,
	`method` enum('razorpay','cash','cheque','neft') NOT NULL,
	`status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`razorpay_order_id` varchar(120),
	`razorpay_payment_id` varchar(120),
	`receipt_number` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resident_profiles` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`emergency_contact` varchar(40),
	`vehicle_number` varchar(32),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `resident_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `resident_profiles_tenant_user_uidx` UNIQUE(`tenant_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vendors` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(80),
	`phone` varchar(20),
	`email` varchar(200),
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification_documents` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`resident_id` char(36) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`blob_path` varchar(500) NOT NULL,
	`content_type` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `visitors` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`flat_id` char(36) NOT NULL,
	`visitor_name` varchar(120) NOT NULL,
	`phone` varchar(20),
	`purpose` varchar(200),
	`expected_at` datetime(3),
	`checked_in_at` datetime(3),
	`checked_out_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `visitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
-- MySQL 8 does not support "ADD COLUMN IF NOT EXISTS"; this migration is
-- tracked by drizzle's __drizzle_migrations table so it only runs once.
-- If re-running by hand against a DB that already has these columns, drop
-- the relevant statement(s) below first.
ALTER TABLE `complaints` MODIFY COLUMN `status` enum('open','assigned','in_progress','resolved','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `complaints` ADD `assigned_to_user_id` char(36);--> statement-breakpoint
ALTER TABLE `complaints` ADD `sla_due_at` datetime(3);--> statement-breakpoint
ALTER TABLE `societies` ADD `city` varchar(120);--> statement-breakpoint
ALTER TABLE `societies` ADD `pincode` varchar(12);--> statement-breakpoint
ALTER TABLE `societies` ADD `sla_days` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `societies` ADD `billing_defaults` text;--> statement-breakpoint
CREATE INDEX `assets_tenant_idx` ON `assets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_tenant_idx` ON `audit_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `bill_line_items_bill_idx` ON `bill_line_items` (`bill_id`);--> statement-breakpoint
CREATE INDEX `bills_tenant_flat_idx` ON `bills` (`tenant_id`,`flat_id`);--> statement-breakpoint
CREATE INDEX `bills_tenant_period_idx` ON `bills` (`tenant_id`,`period_ym`);--> statement-breakpoint
CREATE INDEX `bookings_tenant_idx` ON `bookings` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `complaint_comments_complaint_idx` ON `complaint_comments` (`complaint_id`);--> statement-breakpoint
CREATE INDEX `complaint_status_events_complaint_idx` ON `complaint_status_events` (`complaint_id`);--> statement-breakpoint
CREATE INDEX `events_tenant_idx` ON `events` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `invitations_tenant_idx` ON `invitations` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `notices_tenant_idx` ON `notices` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `notifications_tenant_user_idx` ON `notifications` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `parking_slots_tenant_idx` ON `parking_slots` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `payments_tenant_flat_idx` ON `payments` (`tenant_id`,`flat_id`);--> statement-breakpoint
CREATE INDEX `payments_tenant_bill_idx` ON `payments` (`tenant_id`,`bill_id`);--> statement-breakpoint
CREATE INDEX `vendors_tenant_idx` ON `vendors` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `verification_documents_resident_idx` ON `verification_documents` (`resident_id`);--> statement-breakpoint
CREATE INDEX `visitors_tenant_flat_idx` ON `visitors` (`tenant_id`,`flat_id`);
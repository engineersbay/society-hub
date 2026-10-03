ALTER TABLE `platform_payment_transactions` ADD `onboarding_id` char(36);
--> statement-breakpoint
CREATE TABLE `society_onboardings` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`plan_id` char(36) NOT NULL,
	`bill_id` char(36) NOT NULL,
	`resume_token_hash` varchar(64) NOT NULL,
	`status` enum('started','payment_pending','paid','provisioned','failed') NOT NULL DEFAULT 'started',
	`name` varchar(200) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`custom_domain` varchar(255),
	`address` varchar(500),
	`city` varchar(120),
	`pincode` varchar(12),
	`chairperson_name` varchar(120),
	`chairperson_email` varchar(200) NOT NULL,
	`chairperson_phone` varchar(20) NOT NULL,
	`chairperson_password_hash` varchar(255) NOT NULL,
	`original_amount_paise` int NOT NULL,
	`due_amount_paise` int NOT NULL,
	`discount_code` varchar(40),
	`payment_transaction_id` char(36),
	`provisioned_at` datetime(3),
	`last_error` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `society_onboardings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `society_onboard_resume_uidx` ON `society_onboardings` (`resume_token_hash`);
--> statement-breakpoint
CREATE INDEX `society_onboard_tenant_idx` ON `society_onboardings` (`tenant_id`);

ALTER TABLE `societies` ADD `slug` varchar(80);
--> statement-breakpoint
ALTER TABLE `societies` ADD `custom_domain` varchar(255);
--> statement-breakpoint
ALTER TABLE `societies` ADD `brand_logo_blob_path` varchar(500);
--> statement-breakpoint
ALTER TABLE `societies` ADD `brand_logo_content_type` varchar(120);
--> statement-breakpoint
ALTER TABLE `societies` ADD `brand_color` varchar(32);
--> statement-breakpoint
ALTER TABLE `societies` ADD `branding_enabled` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE UNIQUE INDEX `societies_slug_uidx` ON `societies` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `societies_custom_domain_uidx` ON `societies` (`custom_domain`);
--> statement-breakpoint
CREATE TABLE `platform_payment_transactions` (
	`id` char(36) NOT NULL,
	`tenant_id` char(36) NOT NULL,
	`bill_id` char(36) NOT NULL,
	`payment_reference` varchar(64) NOT NULL,
	`correlation_id` varchar(64) NOT NULL,
	`idempotency_key` varchar(200) NOT NULL,
	`purpose` varchar(64) NOT NULL DEFAULT 'platform_subscription',
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`amount_paise` int NOT NULL,
	`discount_code` varchar(40),
	`status` enum('initiated','order_pending','order_created','checkout_started','payment_pending','authorized','captured','failed','cancelled','expired','refund_pending','partially_refunded','refunded','reconciliation_required') NOT NULL DEFAULT 'initiated',
	`provider` varchar(32) NOT NULL DEFAULT 'razorpay',
	`provider_order_id` varchar(120),
	`provider_payment_id` varchar(120),
	`failure_code` varchar(80),
	`failure_reason` varchar(500),
	`method` varchar(40),
	`completed_at` datetime(3),
	`failed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `platform_payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_payment_transactions_payment_reference_unique` UNIQUE(`payment_reference`),
	CONSTRAINT `platform_payment_transactions_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `platform_pay_txn_tenant_idx` ON `platform_payment_transactions` (`tenant_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_pay_txn_provider_order_uidx` ON `platform_payment_transactions` (`provider_order_id`);
--> statement-breakpoint
CREATE TABLE `platform_payment_webhook_events` (
	`id` char(36) NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'razorpay',
	`provider_event_id` varchar(120) NOT NULL,
	`event_type` varchar(80) NOT NULL,
	`payment_transaction_id` char(36),
	`provider_order_id` varchar(120),
	`provider_payment_id` varchar(120),
	`correlation_id` varchar(64),
	`signature_valid` boolean NOT NULL DEFAULT false,
	`processing_status` enum('received','processed','already_processed','failed','ignored') NOT NULL DEFAULT 'received',
	`payload_hash` varchar(128),
	`retry_count` int NOT NULL DEFAULT 0,
	`error_code` varchar(80),
	`error_message` varchar(500),
	`received_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `platform_payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_payment_webhook_events_provider_event_id_unique` UNIQUE(`provider_event_id`)
);
--> statement-breakpoint
CREATE TABLE `platform_payment_refunds` (
	`id` char(36) NOT NULL,
	`payment_transaction_id` char(36) NOT NULL,
	`provider_refund_id` varchar(120),
	`amount_paise` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`reason` varchar(500),
	`status` enum('requested','processing','processed','failed') NOT NULL DEFAULT 'requested',
	`correlation_id` varchar(64),
	`idempotency_key` varchar(200) NOT NULL,
	`failure_code` varchar(80),
	`failure_reason` varchar(500),
	`requested_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `platform_payment_refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_payment_refunds_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_pay_refund_provider_uidx` ON `platform_payment_refunds` (`provider_refund_id`);
--> statement-breakpoint
CREATE TABLE `platform_payment_api_logs` (
	`id` char(36) NOT NULL,
	`payment_transaction_id` char(36),
	`correlation_id` varchar(64),
	`provider` varchar(32) NOT NULL DEFAULT 'razorpay',
	`operation` varchar(80) NOT NULL,
	`http_method` varchar(12),
	`endpoint` varchar(255),
	`duration_ms` int,
	`http_status` int,
	`attempt_number` int NOT NULL DEFAULT 1,
	`success` boolean NOT NULL DEFAULT false,
	`error_code` varchar(80),
	`error_message` varchar(500),
	`request_payload_hash` varchar(128),
	`response_payload_hash` varchar(128),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` char(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`updated_by` char(36),
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `platform_payment_api_logs_id` PRIMARY KEY(`id`)
);

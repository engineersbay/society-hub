ALTER TABLE `visitors` ADD `pass_token` char(36);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `otp_hash` varchar(255);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `otp_expires_at` datetime(3);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `expires_at` datetime(3);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `pass_issued_at` datetime(3);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `pass_status` enum('none','issued','used','expired','revoked') NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `visitors` ADD `verified_by_user_id` char(36);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `verified_at` datetime(3);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitors_pass_token_uidx` ON `visitors` (`pass_token`);

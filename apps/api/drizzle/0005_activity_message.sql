-- Fassport-style activity: human-readable message + actor lookup index
ALTER TABLE `audit_logs` ADD COLUMN `message` varchar(500) NULL;
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);

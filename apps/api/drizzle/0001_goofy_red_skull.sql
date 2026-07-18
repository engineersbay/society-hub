ALTER TABLE `user_roles` MODIFY COLUMN `role` enum('admin','resident','superadmin') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_uidx` UNIQUE(`username`);
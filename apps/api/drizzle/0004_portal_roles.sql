-- Expand role enums for platform vs society staff (Manage vs Client Admin).
ALTER TABLE `user_roles` MODIFY COLUMN `role` ENUM(
  'superadmin',
  'chairperson',
  'admin',
  'secretary',
  'treasurer',
  'cashier',
  'committee',
  'resident',
  'tenant'
) NOT NULL;

ALTER TABLE `invitations` MODIFY COLUMN `role` ENUM(
  'superadmin',
  'chairperson',
  'admin',
  'secretary',
  'treasurer',
  'cashier',
  'committee',
  'resident',
  'tenant'
) NOT NULL;

-- Legacy society admin → chairperson
UPDATE `user_roles` SET `role` = 'chairperson' WHERE `role` = 'admin';
UPDATE `invitations` SET `role` = 'chairperson' WHERE `role` = 'admin';

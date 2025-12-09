-- Direct SQL to add currency columns to units table
-- Run this if the migration hasn't been applied

-- Check if columns exist first (MySQL syntax)
-- If columns don't exist, these will add them

ALTER TABLE `units` 
ADD COLUMN IF NOT EXISTS `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`,
ADD COLUMN IF NOT EXISTS `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;

-- Note: IF NOT EXISTS might not work in all MySQL versions
-- If you get an error, use these instead (remove IF NOT EXISTS):

-- ALTER TABLE `units` 
-- ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`;

-- ALTER TABLE `units` 
-- ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`;

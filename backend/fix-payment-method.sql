-- Fix financial_records.payment_method column from ENUM to VARCHAR
-- Run this SQL directly in your database

-- Step 1: Change column type from ENUM to VARCHAR
ALTER TABLE `financial_records` 
MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL;

-- Step 2: Add index for better performance
ALTER TABLE `financial_records` 
ADD INDEX `idx_financial_payment_method` (`payment_method`);

-- Step 3: Record the migration (if not already recorded)
INSERT INTO `migrations` (`migration`, `batch`) 
SELECT '2025_11_22_120000_change_financial_records_payment_method_to_string', 
       COALESCE(MAX(batch), 0) + 1 
FROM `migrations`
WHERE NOT EXISTS (
    SELECT 1 FROM `migrations` 
    WHERE `migration` = '2025_11_22_120000_change_financial_records_payment_method_to_string'
);


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the existing view
        DB::statement('DROP VIEW IF EXISTS `unified_payments`');

        // Recreate the view with property_name and unit_number
        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW `unified_payments` AS 
SELECT 
    `upe`.`id` AS `id`,
    `upe`.`landlord_id` AS `landlord_id`,
    `upe`.`tenant_unit_id` AS `tenant_unit_id`,
    `upe`.`payment_type` AS `payment_type`,
    `upe`.`amount` AS `amount`,
    `upe`.`description` AS `description`,
    `upe`.`transaction_date` AS `transaction_date`,
    `upe`.`due_date` AS `due_date`,
    `upe`.`payment_method` AS `payment_method`,
    `upe`.`reference_number` AS `reference_number`,
    `upe`.`status` AS `status`,
    NULL AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `u`.`unit_number` AS `unit_number`,
    `p`.`name` AS `property_name`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    `upe`.`flow_direction` AS `flow_direction`,
    `upe`.`currency` AS `currency`,
    `upe`.`metadata` AS `metadata`,
    `upe`.`source_type` AS `source_type`,
    `upe`.`source_id` AS `source_id`,
    'native' AS `entry_origin`,
    CONCAT('unified_payment_entry:', `upe`.`id`) AS `composite_id`,
    `upe`.`created_at` AS `created_at`,
    `upe`.`updated_at` AS `updated_at`,
    `upe`.`captured_at` AS `captured_at`,
    `upe`.`voided_at` AS `voided_at`
FROM `unified_payment_entries` `upe`
LEFT JOIN `tenant_units` `tu` ON `upe`.`tenant_unit_id` = `tu`.`id`
LEFT JOIN `units` `u` ON `tu`.`unit_id` = `u`.`id`
LEFT JOIN `properties` `p` ON `u`.`property_id` = `p`.`id`
LEFT JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`
WHERE `upe`.`deleted_at` IS NULL

UNION ALL

SELECT 
    `fr`.`id` AS `id`,
    `fr`.`landlord_id` AS `landlord_id`,
    `fr`.`tenant_unit_id` AS `tenant_unit_id`,
    (CASE 
        WHEN `fr`.`type` = 'rent' THEN 'rent'
        WHEN (`fr`.`type` = 'expense' AND `fr`.`category` IN ('maintenance','repair')) THEN 'maintenance_expense'
        WHEN `fr`.`type` = 'fee' THEN 'fee'
        WHEN `fr`.`type` = 'refund' THEN 'security_refund'
        ELSE 'other_income'
    END) AS `payment_type`,
    `fr`.`amount` AS `amount`,
    `fr`.`description` AS `description`,
    `fr`.`transaction_date` AS `transaction_date`,
    `fr`.`due_date` AS `due_date`,
    `fr`.`payment_method` AS `payment_method`,
    `fr`.`reference_number` AS `reference_number`,
    (CASE 
        WHEN `fr`.`status` IN ('pending','overdue') THEN 'pending'
        WHEN `fr`.`status` IN ('completed','partial') THEN `fr`.`status`
        WHEN `fr`.`status` = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END) AS `status`,
    `fr`.`invoice_number` AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `u`.`unit_number` AS `unit_number`,
    `p`.`name` AS `property_name`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    (CASE 
        WHEN `fr`.`type` IN ('rent','fee','refund') THEN 'income'
        ELSE 'outgoing'
    END) AS `flow_direction`,
    'USD' AS `currency`,
    NULL AS `metadata`,
    'financial_record' AS `source_type`,
    `fr`.`id` AS `source_id`,
    'legacy' AS `entry_origin`,
    CONCAT('financial_record:', `fr`.`id`) AS `composite_id`,
    `fr`.`created_at` AS `created_at`,
    `fr`.`updated_at` AS `updated_at`,
    NULL AS `captured_at`,
    NULL AS `voided_at`
FROM `financial_records` `fr`
JOIN `tenant_units` `tu` ON `fr`.`tenant_unit_id` = `tu`.`id`
JOIN `units` `u` ON `tu`.`unit_id` = `u`.`id`
JOIN `properties` `p` ON `u`.`property_id` = `p`.`id`
JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`

UNION ALL

SELECT 
    `sdr`.`id` AS `id`,
    `sdr`.`landlord_id` AS `landlord_id`,
    `sdr`.`tenant_unit_id` AS `tenant_unit_id`,
    'security_refund' AS `payment_type`,
    `sdr`.`refund_amount` AS `amount`,
    CONCAT('Security Deposit Refund - ', `t`.`full_name`) AS `description`,
    `sdr`.`refund_date` AS `transaction_date`,
    NULL AS `due_date`,
    `sdr`.`payment_method` AS `payment_method`,
    `sdr`.`transaction_reference` AS `reference_number`,
    (CASE 
        WHEN `sdr`.`status` = 'processed' THEN 'completed'
        ELSE `sdr`.`status`
    END) AS `status`,
    `sdr`.`receipt_number` AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `u`.`unit_number` AS `unit_number`,
    `p`.`name` AS `property_name`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    'outgoing' AS `flow_direction`,
    'USD' AS `currency`,
    NULL AS `metadata`,
    'security_deposit_refund' AS `source_type`,
    `sdr`.`id` AS `source_id`,
    'legacy' AS `entry_origin`,
    CONCAT('security_deposit_refund:', `sdr`.`id`) AS `composite_id`,
    `sdr`.`created_at` AS `created_at`,
    `sdr`.`updated_at` AS `updated_at`,
    NULL AS `captured_at`,
    NULL AS `voided_at`
FROM `security_deposit_refunds` `sdr`
JOIN `tenant_units` `tu` ON `sdr`.`tenant_unit_id` = `tu`.`id`
JOIN `units` `u` ON `tu`.`unit_id` = `u`.`id`
JOIN `properties` `p` ON `u`.`property_id` = `p`.`id`
JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`
SQL
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous view without property_name and unit_number
        DB::statement('DROP VIEW IF EXISTS `unified_payments`');

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW `unified_payments` AS 
SELECT 
    `upe`.`id` AS `id`,
    `upe`.`landlord_id` AS `landlord_id`,
    `upe`.`tenant_unit_id` AS `tenant_unit_id`,
    `upe`.`payment_type` AS `payment_type`,
    `upe`.`amount` AS `amount`,
    `upe`.`description` AS `description`,
    `upe`.`transaction_date` AS `transaction_date`,
    `upe`.`due_date` AS `due_date`,
    `upe`.`payment_method` AS `payment_method`,
    `upe`.`reference_number` AS `reference_number`,
    `upe`.`status` AS `status`,
    NULL AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    `upe`.`flow_direction` AS `flow_direction`,
    `upe`.`currency` AS `currency`,
    `upe`.`metadata` AS `metadata`,
    `upe`.`source_type` AS `source_type`,
    `upe`.`source_id` AS `source_id`,
    'native' AS `entry_origin`,
    CONCAT('unified_payment_entry:', `upe`.`id`) AS `composite_id`,
    `upe`.`created_at` AS `created_at`,
    `upe`.`updated_at` AS `updated_at`,
    `upe`.`captured_at` AS `captured_at`,
    `upe`.`voided_at` AS `voided_at`
FROM `unified_payment_entries` `upe`
LEFT JOIN `tenant_units` `tu` ON `upe`.`tenant_unit_id` = `tu`.`id`
LEFT JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`
WHERE `upe`.`deleted_at` IS NULL

UNION ALL

SELECT 
    `fr`.`id` AS `id`,
    `fr`.`landlord_id` AS `landlord_id`,
    `fr`.`tenant_unit_id` AS `tenant_unit_id`,
    (CASE 
        WHEN `fr`.`type` = 'rent' THEN 'rent'
        WHEN (`fr`.`type` = 'expense' AND `fr`.`category` IN ('maintenance','repair')) THEN 'maintenance_expense'
        WHEN `fr`.`type` = 'fee' THEN 'fee'
        WHEN `fr`.`type` = 'refund' THEN 'security_refund'
        ELSE 'other_income'
    END) AS `payment_type`,
    `fr`.`amount` AS `amount`,
    `fr`.`description` AS `description`,
    `fr`.`transaction_date` AS `transaction_date`,
    `fr`.`due_date` AS `due_date`,
    `fr`.`payment_method` AS `payment_method`,
    `fr`.`reference_number` AS `reference_number`,
    (CASE 
        WHEN `fr`.`status` IN ('pending','overdue') THEN 'pending'
        WHEN `fr`.`status` IN ('completed','partial') THEN `fr`.`status`
        WHEN `fr`.`status` = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END) AS `status`,
    `fr`.`invoice_number` AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    (CASE 
        WHEN `fr`.`type` IN ('rent','fee','refund') THEN 'income'
        ELSE 'outgoing'
    END) AS `flow_direction`,
    'USD' AS `currency`,
    NULL AS `metadata`,
    'financial_record' AS `source_type`,
    `fr`.`id` AS `source_id`,
    'legacy' AS `entry_origin`,
    CONCAT('financial_record:', `fr`.`id`) AS `composite_id`,
    `fr`.`created_at` AS `created_at`,
    `fr`.`updated_at` AS `updated_at`,
    NULL AS `captured_at`,
    NULL AS `voided_at`
FROM `financial_records` `fr`
JOIN `tenant_units` `tu` ON `fr`.`tenant_unit_id` = `tu`.`id`
JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`

UNION ALL

SELECT 
    `sdr`.`id` AS `id`,
    `sdr`.`landlord_id` AS `landlord_id`,
    `sdr`.`tenant_unit_id` AS `tenant_unit_id`,
    'security_refund' AS `payment_type`,
    `sdr`.`refund_amount` AS `amount`,
    CONCAT('Security Deposit Refund - ', `t`.`full_name`) AS `description`,
    `sdr`.`refund_date` AS `transaction_date`,
    NULL AS `due_date`,
    `sdr`.`payment_method` AS `payment_method`,
    `sdr`.`transaction_reference` AS `reference_number`,
    (CASE 
        WHEN `sdr`.`status` = 'processed' THEN 'completed'
        ELSE `sdr`.`status`
    END) AS `status`,
    `sdr`.`receipt_number` AS `invoice_number`,
    `tu`.`unit_id` AS `unit_id`,
    `t`.`full_name` AS `tenant_name`,
    NULL AS `vendor_name`,
    'outgoing' AS `flow_direction`,
    'USD' AS `currency`,
    NULL AS `metadata`,
    'security_deposit_refund' AS `source_type`,
    `sdr`.`id` AS `source_id`,
    'legacy' AS `entry_origin`,
    CONCAT('security_deposit_refund:', `sdr`.`id`) AS `composite_id`,
    `sdr`.`created_at` AS `created_at`,
    `sdr`.`updated_at` AS `updated_at`,
    NULL AS `captured_at`,
    NULL AS `voided_at`
FROM `security_deposit_refunds` `sdr`
JOIN `tenant_units` `tu` ON `sdr`.`tenant_unit_id` = `tu`.`id`
JOIN `tenants` `t` ON `tu`.`tenant_id` = `t`.`id`
SQL
        );
    }
};

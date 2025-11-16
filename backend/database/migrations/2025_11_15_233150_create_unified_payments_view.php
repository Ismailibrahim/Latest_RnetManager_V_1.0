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
        // Drop table if it exists (in case it was created as a table)
        Schema::dropIfExists('unified_payments');

        DB::statement('DROP VIEW IF EXISTS `unified_payments`');

        DB::statement(<<<'SQL'
CREATE OR REPLACE VIEW `unified_payments` AS select `upe`.`id` AS `id`,`upe`.`landlord_id` AS `landlord_id`,`upe`.`tenant_unit_id` AS `tenant_unit_id`,`upe`.`payment_type` AS `payment_type`,`upe`.`amount` AS `amount`,`upe`.`description` AS `description`,`upe`.`transaction_date` AS `transaction_date`,`upe`.`due_date` AS `due_date`,`upe`.`payment_method` AS `payment_method`,`upe`.`reference_number` AS `reference_number`,`upe`.`status` AS `status`,NULL AS `invoice_number`,`tu`.`unit_id` AS `unit_id`,`t`.`full_name` AS `tenant_name`,NULL AS `vendor_name`,`upe`.`flow_direction` AS `flow_direction`,`upe`.`currency` AS `currency`,`upe`.`metadata` AS `metadata`,`upe`.`source_type` AS `source_type`,`upe`.`source_id` AS `source_id`,'native' AS `entry_origin`,concat('unified_payment_entry:',`upe`.`id`) AS `composite_id`,`upe`.`created_at` AS `created_at`,`upe`.`updated_at` AS `updated_at`,`upe`.`captured_at` AS `captured_at`,`upe`.`voided_at` AS `voided_at` from ((`unified_payment_entries` `upe` left join `tenant_units` `tu` on((`upe`.`tenant_unit_id` = `tu`.`id`))) left join `tenants` `t` on((`tu`.`tenant_id` = `t`.`id`))) where (`upe`.`deleted_at` is null) union all select `fr`.`id` AS `id`,`fr`.`landlord_id` AS `landlord_id`,`fr`.`tenant_unit_id` AS `tenant_unit_id`,(case when (`fr`.`type` = 'rent') then 'rent' when ((`fr`.`type` = 'expense') and (`fr`.`category` in ('maintenance','repair'))) then 'maintenance_expense' when (`fr`.`type` = 'fee') then 'fee' when (`fr`.`type` = 'refund') then 'security_refund' else 'other_income' end) AS `payment_type`,`fr`.`amount` AS `amount`,`fr`.`description` AS `description`,`fr`.`transaction_date` AS `transaction_date`,`fr`.`due_date` AS `due_date`,`fr`.`payment_method` AS `payment_method`,`fr`.`reference_number` AS `reference_number`,(case when (`fr`.`status` in ('pending','overdue')) then 'pending' when (`fr`.`status` in ('completed','partial')) then `fr`.`status` when (`fr`.`status` = 'cancelled') then 'cancelled' else 'pending' end) AS `status`,`fr`.`invoice_number` AS `invoice_number`,`tu`.`unit_id` AS `unit_id`,`t`.`full_name` AS `tenant_name`,NULL AS `vendor_name`,(case when (`fr`.`type` in ('rent','fee','refund')) then 'income' else 'outgoing' end) AS `flow_direction`,'USD' AS `currency`,NULL AS `metadata`,'financial_record' AS `source_type`,`fr`.`id` AS `source_id`,'legacy' AS `entry_origin`,concat('financial_record:',`fr`.`id`) AS `composite_id`,`fr`.`created_at` AS `created_at`,`fr`.`updated_at` AS `updated_at`,NULL AS `captured_at`,NULL AS `voided_at` from ((`financial_records` `fr` join `tenant_units` `tu` on((`fr`.`tenant_unit_id` = `tu`.`id`))) join `tenants` `t` on((`tu`.`tenant_id` = `t`.`id`))) union all select `sdr`.`id` AS `id`,`sdr`.`landlord_id` AS `landlord_id`,`sdr`.`tenant_unit_id` AS `tenant_unit_id`,'security_refund' AS `payment_type`,`sdr`.`refund_amount` AS `amount`,concat('Security Deposit Refund - ',`t`.`full_name`) AS `description`,`sdr`.`refund_date` AS `transaction_date`,NULL AS `due_date`,`sdr`.`payment_method` AS `payment_method`,`sdr`.`transaction_reference` AS `reference_number`,(case when (`sdr`.`status` = 'processed') then 'completed' else `sdr`.`status` end) AS `status`,`sdr`.`receipt_number` AS `invoice_number`,`tu`.`unit_id` AS `unit_id`,`t`.`full_name` AS `tenant_name`,NULL AS `vendor_name`,'outgoing' AS `flow_direction`,'USD' AS `currency`,NULL AS `metadata`,'security_deposit_refund' AS `source_type`,`sdr`.`id` AS `source_id`,'legacy' AS `entry_origin`,concat('security_deposit_refund:',`sdr`.`id`) AS `composite_id`,`sdr`.`created_at` AS `created_at`,`sdr`.`updated_at` AS `updated_at`,NULL AS `captured_at`,NULL AS `voided_at` from ((`security_deposit_refunds` `sdr` join `tenant_units` `tu` on((`sdr`.`tenant_unit_id` = `tu`.`id`))) join `tenants` `t` on((`tu`.`tenant_id` = `t`.`id`)))
SQL
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS `unified_payments`');
    }
};

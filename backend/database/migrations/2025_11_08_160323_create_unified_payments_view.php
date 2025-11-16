<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('DROP VIEW IF EXISTS unified_payments');

        DB::statement(<<<SQL
            CREATE VIEW unified_payments AS
            SELECT
                fr.id,
                fr.landlord_id,
                fr.tenant_unit_id,
                'rent' AS payment_type,
                fr.amount,
                fr.description,
                fr.transaction_date,
                fr.due_date,
                fr.payment_method,
                fr.reference_number,
                fr.status,
                fr.invoice_number,
                tu.unit_id,
                t.full_name AS tenant_name,
                NULL AS vendor_name,
                'income' AS flow_direction
            FROM financial_records fr
            JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
            JOIN tenants t ON tu.tenant_id = t.id
            WHERE fr.type = 'rent'

            UNION ALL

            SELECT
                fr.id,
                fr.landlord_id,
                fr.tenant_unit_id,
                'maintenance_expense' AS payment_type,
                fr.amount,
                fr.description,
                fr.transaction_date,
                fr.due_date,
                fr.payment_method,
                fr.reference_number,
                fr.status,
                fr.invoice_number,
                tu.unit_id,
                t.full_name AS tenant_name,
                mr.serviced_by AS vendor_name,
                'outgoing' AS flow_direction
            FROM financial_records fr
            JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
            JOIN tenants t ON tu.tenant_id = t.id
            JOIN maintenance_requests mr ON fr.description LIKE CONCAT('%', mr.id, '%')
            WHERE fr.type = 'expense' AND fr.category = 'maintenance'

            UNION ALL

            SELECT
                sdr.id,
                sdr.landlord_id,
                sdr.tenant_unit_id,
                'security_refund' AS payment_type,
                sdr.refund_amount AS amount,
                CONCAT('Security Deposit Refund - ', t.full_name) AS description,
                sdr.refund_date AS transaction_date,
                NULL AS due_date,
                sdr.payment_method,
                sdr.transaction_reference AS reference_number,
                CASE
                    WHEN sdr.status = 'processed' THEN 'completed'
                    ELSE sdr.status
                END AS status,
                sdr.receipt_number AS invoice_number,
                tu.unit_id,
                t.full_name AS tenant_name,
                NULL AS vendor_name,
                'outgoing' AS flow_direction
            FROM security_deposit_refunds sdr
            JOIN tenant_units tu ON sdr.tenant_unit_id = tu.id
            JOIN tenants t ON tu.tenant_id = t.id;
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS unified_payments');
    }
};

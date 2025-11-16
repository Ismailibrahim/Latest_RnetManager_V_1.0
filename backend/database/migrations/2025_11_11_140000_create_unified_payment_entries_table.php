<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('unified_payment_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landlord_id')->constrained('landlords')->cascadeOnDelete();
            $table->foreignId('tenant_unit_id')->nullable()->constrained('tenant_units')->nullOnDelete();
            $table->enum('payment_type', [
                'rent',
                'maintenance_expense',
                'security_refund',
                'fee',
                'other_income',
                'other_outgoing',
            ]);
            $table->enum('flow_direction', ['income', 'outgoing']);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('description', 500)->nullable();
            $table->date('due_date')->nullable();
            $table->date('transaction_date')->nullable();
            $table->enum('status', [
                'draft',
                'pending',
                'scheduled',
                'completed',
                'partial',
                'cancelled',
                'failed',
                'refunded',
            ])->default('draft');
            $table->string('payment_method', 150)->nullable();
            $table->string('reference_number', 150)->nullable();
            $table->string('source_type', 150)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('landlord_id', 'idx_unified_payment_entries_landlord');
            $table->index('tenant_unit_id', 'idx_unified_payment_entries_tenant_unit');
            $table->index('payment_type', 'idx_unified_payment_entries_type');
            $table->index('flow_direction', 'idx_unified_payment_entries_flow');
            $table->index('status', 'idx_unified_payment_entries_status');
            $table->index(['source_type', 'source_id'], 'idx_unified_payment_entries_source');
        });

        DB::statement('DROP VIEW IF EXISTS unified_payments');

        DB::statement(<<<SQL
            CREATE VIEW unified_payments AS
            SELECT
                upe.id,
                upe.landlord_id,
                upe.tenant_unit_id,
                upe.payment_type,
                upe.amount,
                upe.description,
                upe.transaction_date,
                upe.due_date,
                upe.payment_method,
                upe.reference_number,
                upe.status,
                NULL AS invoice_number,
                tu.unit_id,
                t.full_name AS tenant_name,
                NULL AS vendor_name,
                upe.flow_direction,
                upe.currency,
                upe.metadata,
                upe.source_type,
                upe.source_id,
                'native' AS entry_origin,
                CONCAT('unified_payment_entry:', upe.id) AS composite_id,
                upe.created_at,
                upe.updated_at,
                upe.captured_at,
                upe.voided_at
            FROM unified_payment_entries upe
            LEFT JOIN tenant_units tu ON upe.tenant_unit_id = tu.id
            LEFT JOIN tenants t ON tu.tenant_id = t.id
            WHERE upe.deleted_at IS NULL

            UNION ALL

            SELECT
                fr.id,
                fr.landlord_id,
                fr.tenant_unit_id,
                CASE
                    WHEN fr.type = 'rent' THEN 'rent'
                    WHEN fr.type = 'expense' AND fr.category IN ('maintenance', 'repair') THEN 'maintenance_expense'
                    WHEN fr.type = 'fee' THEN 'fee'
                    WHEN fr.type = 'refund' THEN 'security_refund'
                    ELSE 'other_income'
                END AS payment_type,
                fr.amount,
                fr.description,
                fr.transaction_date,
                fr.due_date,
                fr.payment_method,
                fr.reference_number,
                CASE
                    WHEN fr.status IN ('pending', 'overdue') THEN 'pending'
                    WHEN fr.status IN ('completed', 'partial') THEN fr.status
                    WHEN fr.status = 'cancelled' THEN 'cancelled'
                    ELSE 'pending'
                END AS status,
                fr.invoice_number,
                tu.unit_id,
                t.full_name AS tenant_name,
                NULL AS vendor_name,
                CASE
                    WHEN fr.type IN ('rent', 'fee', 'refund') THEN 'income'
                    ELSE 'outgoing'
                END AS flow_direction,
                'USD' AS currency,
                NULL AS metadata,
                'financial_record' AS source_type,
                fr.id AS source_id,
                'legacy' AS entry_origin,
                CONCAT('financial_record:', fr.id) AS composite_id,
                fr.created_at,
                fr.updated_at,
                NULL AS captured_at,
                NULL AS voided_at
            FROM financial_records fr
            JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
            JOIN tenants t ON tu.tenant_id = t.id

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
                'outgoing' AS flow_direction,
                'USD' AS currency,
                NULL AS metadata,
                'security_deposit_refund' AS source_type,
                sdr.id AS source_id,
                'legacy' AS entry_origin,
                CONCAT('security_deposit_refund:', sdr.id) AS composite_id,
                sdr.created_at,
                sdr.updated_at,
                NULL AS captured_at,
                NULL AS voided_at
            FROM security_deposit_refunds sdr
            JOIN tenant_units tu ON sdr.tenant_unit_id = tu.id
            JOIN tenants t ON tu.tenant_id = t.id
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS unified_payments');

        Schema::dropIfExists('unified_payment_entries');

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
            JOIN tenants t ON tu.tenant_id = t.id
        SQL);
    }
};


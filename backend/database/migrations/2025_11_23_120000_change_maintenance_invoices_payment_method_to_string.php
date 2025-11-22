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
        // Check if maintenance_invoices table exists
        if (!Schema::hasTable('maintenance_invoices')) {
            return;
        }

        // Use raw SQL to change ENUM to VARCHAR
        // This preserves existing data while changing the column type
        DB::statement("ALTER TABLE `maintenance_invoices` MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL");

        // Add index for better query performance
        Schema::table('maintenance_invoices', function (Blueprint $table) {
            $table->index('payment_method', 'idx_maintenance_invoices_payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('maintenance_invoices')) {
            return;
        }

        // Remove index
        Schema::table('maintenance_invoices', function (Blueprint $table) {
            $table->dropIndex('idx_maintenance_invoices_payment_method');
        });

        // Normalize any existing values to valid ENUM values before converting back
        DB::statement("
            UPDATE `maintenance_invoices` 
            SET `payment_method` = CASE
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%cash%' THEN 'cash'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%bank%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%transfer%' THEN 'bank_transfer'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%upi%' THEN 'upi'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%card%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%credit%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%debit%' THEN 'card'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%cheque%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%check%' THEN 'cheque'
                ELSE NULL
            END
            WHERE `payment_method` IS NOT NULL
        ");

        // Change back to ENUM
        DB::statement("ALTER TABLE `maintenance_invoices` MODIFY COLUMN `payment_method` ENUM('cash', 'bank_transfer', 'upi', 'card', 'cheque') NULL DEFAULT NULL");
    }
};


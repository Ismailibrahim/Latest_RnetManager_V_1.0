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
        // Check if financial_records table exists
        if (!Schema::hasTable('financial_records')) {
            return;
        }

        Schema::table('financial_records', function (Blueprint $table) {
            // Drop the ENUM constraint by modifying the column to VARCHAR
            // We'll use DB::statement for this as Laravel doesn't handle ENUM changes well
        });

        // Use raw SQL to change ENUM to VARCHAR
        // This preserves existing data while changing the column type
        DB::statement("ALTER TABLE `financial_records` MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL");

        // Add index for better query performance
        Schema::table('financial_records', function (Blueprint $table) {
            $table->index('payment_method', 'idx_financial_payment_method');
        });

        // Optional: Add foreign key constraint to payment_methods table
        // Note: This requires payment_methods.name to match exactly
        // We'll make it nullable and not enforce foreign key to allow flexibility
        // If you want strict enforcement, uncomment the following:
        /*
        if (Schema::hasTable('payment_methods')) {
            Schema::table('financial_records', function (Blueprint $table) {
                $table->foreign('payment_method')
                    ->references('name')
                    ->on('payment_methods')
                    ->onDelete('set null')
                    ->onUpdate('cascade');
            });
        }
        */
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('financial_records')) {
            return;
        }

        // Remove index
        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropIndex('idx_financial_payment_method');
        });

        // Convert back to ENUM
        // First, normalize any existing values to valid ENUM values
        DB::statement("
            UPDATE `financial_records` 
            SET `payment_method` = CASE
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%cash%' THEN 'cash'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%bank%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%transfer%' THEN 'bank_transfer'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%upi%' THEN 'upi'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%card%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%credit%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%debit%' THEN 'card'
                WHEN LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%cheque%' OR LOWER(REPLACE(REPLACE(REPLACE(`payment_method`, ' ', ''), '_', ''), '-', '')) LIKE '%check%' THEN 'cheque'
                ELSE 'cash'
            END
            WHERE `payment_method` IS NOT NULL
        ");

        // Change back to ENUM
        DB::statement("ALTER TABLE `financial_records` MODIFY COLUMN `payment_method` ENUM('cash', 'bank_transfer', 'upi', 'card', 'cheque') NULL DEFAULT 'cash'");
    }
};


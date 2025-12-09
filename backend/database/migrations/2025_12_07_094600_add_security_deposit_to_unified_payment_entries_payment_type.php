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
        // Check if the table exists
        if (!Schema::hasTable('unified_payment_entries')) {
            return;
        }

        // Modify the ENUM to include 'security_deposit'
        // MySQL requires us to recreate the ENUM with all values
        DB::statement("ALTER TABLE `unified_payment_entries` MODIFY COLUMN `payment_type` ENUM('rent', 'maintenance_expense', 'security_deposit', 'security_refund', 'fee', 'other_income', 'other_outgoing') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('unified_payment_entries')) {
            return;
        }

        // Remove 'security_deposit' from the ENUM
        DB::statement("ALTER TABLE `unified_payment_entries` MODIFY COLUMN `payment_type` ENUM('rent', 'maintenance_expense', 'security_refund', 'fee', 'other_income', 'other_outgoing') NOT NULL");
    }
};

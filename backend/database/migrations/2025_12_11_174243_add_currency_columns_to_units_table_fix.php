<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if table exists
        if (!Schema::hasTable('units')) {
            return;
        }

        // Use raw SQL for more reliable column addition
        // Check and add currency column
        if (!Schema::hasColumn('units', 'currency')) {
            try {
                DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            } catch (\Exception $e) {
                // If column already exists or other error, log but don't fail
                if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                    throw $e;
                }
            }
        }

        // Check and add security_deposit_currency column
        if (!Schema::hasColumn('units', 'security_deposit_currency')) {
            try {
                DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            } catch (\Exception $e) {
                // If column already exists or other error, log but don't fail
                if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                    throw $e;
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('units')) {
            return;
        }

        Schema::table('units', function (Blueprint $table) {
            if (Schema::hasColumn('units', 'currency')) {
                $table->dropColumn('currency');
            }
            if (Schema::hasColumn('units', 'security_deposit_currency')) {
                $table->dropColumn('security_deposit_currency');
            }
        });
    }
};

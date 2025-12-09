<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tenant_units')) {
            return;
        }

        if (!Schema::hasColumn('tenant_units', 'currency')) {
            try {
                DB::statement("ALTER TABLE `tenant_units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `monthly_rent`");
            } catch (\Exception $e) {
                if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                    throw $e;
                }
            }
        }

        try {
            DB::statement("
                UPDATE tenant_units tu
                INNER JOIN units u ON tu.unit_id = u.id
                SET tu.currency = COALESCE(u.currency, 'MVR')
                WHERE tu.currency = 'MVR' OR tu.currency IS NULL
            ");
        } catch (\Exception $e) {
            // Continue if update fails
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('tenant_units')) {
            return;
        }

        Schema::table('tenant_units', function (Blueprint $table) {
            if (Schema::hasColumn('tenant_units', 'currency')) {
                $table->dropColumn('currency');
            }
        });
    }
};

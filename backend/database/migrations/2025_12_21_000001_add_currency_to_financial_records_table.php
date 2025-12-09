<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('financial_records')) {
            return;
        }

        if (!Schema::hasColumn('financial_records', 'currency')) {
            try {
                DB::statement("ALTER TABLE `financial_records` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `amount`");
            } catch (\Exception $e) {
                if (strpos($e->getMessage(), 'Duplicate column name') === false) {
                    throw $e;
                }
            }
        }

        try {
            DB::statement("
                UPDATE financial_records fr
                INNER JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
                SET fr.currency = COALESCE(tu.currency, 'MVR')
                WHERE (fr.currency = 'MVR' OR fr.currency IS NULL) AND fr.tenant_unit_id IS NOT NULL
            ");
        } catch (\Exception $e) {
            // Continue if update fails
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('financial_records')) {
            return;
        }

        Schema::table('financial_records', function (Blueprint $table) {
            if (Schema::hasColumn('financial_records', 'currency')) {
                $table->dropColumn('currency');
            }
        });
    }
};

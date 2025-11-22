<?php

/**
 * Quick fix script to change payment_method from ENUM to VARCHAR
 * Run: php fix-payment-method.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔧 Fixing financial_records.payment_method column...\n\n";

try {
    // Check current type
    $columnInfo = DB::select("
        SELECT COLUMN_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'financial_records' 
        AND COLUMN_NAME = 'payment_method'
    ");

    if (empty($columnInfo)) {
        echo "❌ Column not found!\n";
        exit(1);
    }

    $currentType = $columnInfo[0]->COLUMN_TYPE;
    echo "Current type: {$currentType}\n";

    if (str_contains(strtolower($currentType), 'enum')) {
        echo "Changing to VARCHAR(120)...\n";
        DB::statement("ALTER TABLE `financial_records` MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL");
        echo "✅ Column changed!\n";

        // Add index
        $indexes = DB::select("SHOW INDEXES FROM `financial_records` WHERE Column_name = 'payment_method'");
        if (empty($indexes)) {
            Schema::table('financial_records', function ($table) {
                try {
                    $table->index('payment_method', 'idx_financial_payment_method');
                } catch (\Exception $e) {
                    if (!str_contains($e->getMessage(), 'Duplicate')) {
                        throw $e;
                    }
                }
            });
            echo "✅ Index added!\n";
        } else {
            echo "✅ Index already exists!\n";
        }

        // Record migration
        $exists = DB::table('migrations')
            ->where('migration', '2025_11_22_120000_change_financial_records_payment_method_to_string')
            ->exists();

        if (!$exists) {
            $batch = DB::table('migrations')->max('batch') ?? 0;
            DB::table('migrations')->insert([
                'migration' => '2025_11_22_120000_change_financial_records_payment_method_to_string',
                'batch' => $batch + 1,
            ]);
            echo "✅ Migration recorded!\n";
        } else {
            echo "✅ Migration already recorded!\n";
        }
    } else {
        echo "✅ Column is already VARCHAR - no changes needed!\n";
    }

    echo "\n✅ Done! Clear caches and restart server:\n";
    echo "   php artisan cache:clear\n";
    echo "   php artisan config:clear\n";

} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}


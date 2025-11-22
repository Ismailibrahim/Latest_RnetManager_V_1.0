<?php

/**
 * Quick script to run the payment method migration
 * 
 * Usage: php run-migration.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "🔍 Checking financial_records.payment_method column type...\n";

try {
    // Check current column type
    $columnInfo = DB::select("
        SELECT COLUMN_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'financial_records' 
        AND COLUMN_NAME = 'payment_method'
    ");

    if (empty($columnInfo)) {
        echo "❌ financial_records table or payment_method column not found!\n";
        exit(1);
    }

    $currentType = $columnInfo[0]->COLUMN_TYPE;
    echo "Current type: {$currentType}\n\n";

    if (str_contains($currentType, 'enum')) {
        echo "⚠️  Column is still ENUM. Running migration...\n\n";
        
        // Run the migration
        DB::statement("ALTER TABLE `financial_records` MODIFY COLUMN `payment_method` VARCHAR(120) NULL DEFAULT NULL");
        
        // Add index
        if (!Schema::hasColumn('financial_records', 'payment_method')) {
            echo "❌ Column doesn't exist after migration!\n";
            exit(1);
        }
        
        Schema::table('financial_records', function ($table) {
            try {
                $table->index('payment_method', 'idx_financial_payment_method');
            } catch (\Exception $e) {
                // Index might already exist
                if (!str_contains($e->getMessage(), 'Duplicate key name')) {
                    throw $e;
                }
            }
        });
        
        echo "✅ Migration completed successfully!\n";
        echo "✅ payment_method is now VARCHAR(120)\n";
    } else {
        echo "✅ Column is already VARCHAR. No migration needed.\n";
    }

    // Verify
    $columnInfo = DB::select("
        SELECT COLUMN_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'financial_records' 
        AND COLUMN_NAME = 'payment_method'
    ");
    
    $newType = $columnInfo[0]->COLUMN_TYPE;
    echo "\nFinal type: {$newType}\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}


<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "Checking financial_records.payment_method column type...\n\n";

if (!Schema::hasTable('financial_records')) {
    echo "❌ Table 'financial_records' does not exist!\n";
    exit(1);
}

try {
    $result = DB::select("
        SELECT 
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'financial_records' 
          AND COLUMN_NAME = 'payment_method'
    ");

    if (empty($result)) {
        echo "❌ Column 'payment_method' not found in 'financial_records' table!\n";
        exit(1);
    }

    $column = $result[0];
    
    echo "Column Information:\n";
    echo "===================\n";
    echo "Column Name: {$column->COLUMN_NAME}\n";
    echo "Column Type: {$column->COLUMN_TYPE}\n";
    echo "Data Type: {$column->DATA_TYPE}\n";
    echo "Is Nullable: {$column->IS_NULLABLE}\n";
    echo "Default: " . ($column->COLUMN_DEFAULT ?? 'NULL') . "\n";
    if ($column->CHARACTER_MAXIMUM_LENGTH) {
        echo "Max Length: {$column->CHARACTER_MAXIMUM_LENGTH}\n";
    }
    echo "\n";

    // Check if it's ENUM or VARCHAR
    $columnType = strtolower($column->COLUMN_TYPE);
    $dataType = strtolower($column->DATA_TYPE);

    if (strpos($columnType, 'enum') !== false) {
        echo "⚠️  STATUS: Column is still ENUM type!\n";
        echo "   Migration needed: 2025_11_22_120000_change_financial_records_payment_method_to_string\n";
        echo "\n";
        echo "To fix, run:\n";
        echo "  php artisan migrate\n";
        echo "  OR\n";
        echo "  php backend/run-migration.php\n";
    } elseif ($dataType === 'varchar' || strpos($columnType, 'varchar') !== false) {
        echo "✅ STATUS: Column is already VARCHAR type!\n";
        echo "   Migration has been applied successfully.\n";
    } else {
        echo "⚠️  STATUS: Unknown column type: {$column->COLUMN_TYPE}\n";
    }

    // Check if migration has been run
    echo "\n";
    echo "Checking migration status...\n";
    $migration = DB::table('migrations')
        ->where('migration', '2025_11_22_120000_change_financial_records_payment_method_to_string')
        ->first();

    if ($migration) {
        echo "✅ Migration record found in migrations table (batch: {$migration->batch})\n";
    } else {
        echo "⚠️  Migration record NOT found in migrations table\n";
        echo "   This means the migration may not have been run yet.\n";
    }

} catch (\Exception $e) {
    echo "❌ Error checking column: " . $e->getMessage() . "\n";
    exit(1);
}


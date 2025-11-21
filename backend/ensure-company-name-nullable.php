<?php

/**
 * Script to ensure company_name column is nullable in landlords table
 * Run this with: php ensure-company-name-nullable.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "Checking landlords table schema...\n";

try {
    // Check if column exists and if it's nullable
    $columns = DB::select("SHOW COLUMNS FROM landlords WHERE Field = 'company_name'");
    
    if (empty($columns)) {
        echo "ERROR: company_name column does not exist in landlords table!\n";
        exit(1);
    }
    
    $column = $columns[0];
    $isNullable = strtolower($column->Null) === 'yes';
    
    echo "Current company_name column status:\n";
    echo "  - Type: {$column->Type}\n";
    echo "  - Null: {$column->Null}\n";
    echo "  - Default: " . ($column->Default ?? 'NULL') . "\n";
    
    if (!$isNullable) {
        echo "\n⚠️  WARNING: company_name is NOT NULL. Making it nullable...\n";
        
        try {
            DB::statement("ALTER TABLE landlords MODIFY COLUMN company_name VARCHAR(255) NULL");
            echo "✅ Successfully made company_name nullable!\n";
        } catch (\Exception $e) {
            echo "❌ ERROR: Failed to alter column: " . $e->getMessage() . "\n";
            exit(1);
        }
    } else {
        echo "\n✅ company_name is already nullable. No changes needed.\n";
    }
    
    // Verify the change
    $columns = DB::select("SHOW COLUMNS FROM landlords WHERE Field = 'company_name'");
    $column = $columns[0];
    $isNullable = strtolower($column->Null) === 'yes';
    
    if ($isNullable) {
        echo "\n✅ Verification: company_name is now nullable.\n";
    } else {
        echo "\n❌ Verification failed: company_name is still NOT NULL.\n";
        exit(1);
    }
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ All done! The company_name field is now optional.\n";


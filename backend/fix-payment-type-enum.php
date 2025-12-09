<?php

/**
 * Direct fix for payment_type ENUM to add 'security_deposit'
 * Run: php fix-payment-type-enum.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "========================================\n";
echo "FIXING PAYMENT_TYPE ENUM\n";
echo "========================================\n\n";

if (!Schema::hasTable('unified_payment_entries')) {
    echo "❌ Table 'unified_payment_entries' does not exist!\n";
    exit(1);
}

// Get current column definition
$columnInfo = DB::select("
    SELECT COLUMN_TYPE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'unified_payment_entries' 
    AND COLUMN_NAME = 'payment_type'
");

if (empty($columnInfo)) {
    echo "❌ Column 'payment_type' not found!\n";
    exit(1);
}

$currentType = $columnInfo[0]->COLUMN_TYPE;
echo "Current ENUM type: {$currentType}\n\n";

// Check if 'security_deposit' is already in the ENUM
if (str_contains($currentType, 'security_deposit')) {
    echo "✅ 'security_deposit' is already in the ENUM. No changes needed.\n";
    exit(0);
}

echo "Updating ENUM to include 'security_deposit'...\n";

try {
    // Update the ENUM to include 'security_deposit'
    DB::statement("ALTER TABLE `unified_payment_entries` MODIFY COLUMN `payment_type` ENUM('rent', 'maintenance_expense', 'security_deposit', 'security_refund', 'fee', 'other_income', 'other_outgoing') NOT NULL");
    
    echo "✅ Successfully updated payment_type ENUM!\n\n";
    
    // Verify the change
    $newColumnInfo = DB::select("
        SELECT COLUMN_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'unified_payment_entries' 
        AND COLUMN_NAME = 'payment_type'
    ");
    
    if (!empty($newColumnInfo)) {
        $newType = $newColumnInfo[0]->COLUMN_TYPE;
        echo "New ENUM type: {$newType}\n";
        
        if (str_contains($newType, 'security_deposit')) {
            echo "✅ Verification successful! 'security_deposit' is now in the ENUM.\n";
        } else {
            echo "⚠️  Warning: 'security_deposit' not found in new type. Please check manually.\n";
        }
    }
} catch (\Exception $e) {
    echo "❌ Error updating ENUM: " . $e->getMessage() . "\n";
    exit(1);
}

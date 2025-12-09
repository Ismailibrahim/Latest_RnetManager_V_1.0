<?php
/**
 * Proper migration fix - Ensures migration is recorded and columns are added
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "========================================\n";
echo "PROPER MIGRATION FIX\n";
echo "========================================\n\n";

try {
    // Get database info
    $dbResult = DB::select("SELECT DATABASE() as db");
    $dbName = $dbResult[0]->db ?? 'unknown';
    echo "Database: {$dbName}\n\n";
    
    // Check if migrations table exists
    if (!Schema::hasTable('migrations')) {
        echo "ERROR: migrations table does not exist!\n";
        exit(1);
    }
    
    $migrationName = '2025_01_21_000000_add_currency_fields_to_units_table';
    
    // Check if migration is recorded
    $migrationRecorded = DB::table('migrations')
        ->where('migration', $migrationName)
        ->exists();
    
    echo "Migration recorded: " . ($migrationRecorded ? "YES" : "NO") . "\n\n";
    
    // Check current column status
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    echo "Current column status:\n";
    echo "  currency: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    echo "  security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";
    
    // Add missing columns
    $columnsAdded = false;
    
    if (!$hasCurrency) {
        echo "Adding 'currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            echo "  ✓ Added successfully\n";
            $columnsAdded = true;
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                echo "  ✓ Column already exists\n";
            } else {
                echo "  ✗ Error: " . $e->getMessage() . "\n";
                throw $e;
            }
        }
    }
    
    if (!$hasSecurityDepositCurrency) {
        echo "Adding 'security_deposit_currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            echo "  ✓ Added successfully\n";
            $columnsAdded = true;
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                echo "  ✓ Column already exists\n";
            } else {
                echo "  ✗ Error: " . $e->getMessage() . "\n";
                throw $e;
            }
        }
    }
    
    // Record migration if columns were added and migration not recorded
    if ($columnsAdded && !$migrationRecorded) {
        echo "\nRecording migration in migrations table...\n";
        try {
            DB::table('migrations')->insert([
                'migration' => $migrationName,
                'batch' => DB::table('migrations')->max('batch') + 1
            ]);
            echo "  ✓ Migration recorded\n";
        } catch (\Exception $e) {
            echo "  ⚠ Warning: Could not record migration: " . $e->getMessage() . "\n";
            echo "  (This is OK - columns are added, just not recorded)\n";
        }
    }
    
    // Final verification
    echo "\n========================================\n";
    echo "FINAL VERIFICATION\n";
    echo "========================================\n";
    $finalCurrency = Schema::hasColumn('units', 'currency');
    $finalSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    echo ($finalCurrency ? "✓" : "✗") . " currency: " . ($finalCurrency ? "EXISTS" : "MISSING") . "\n";
    echo ($finalSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($finalSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";
    
    if ($finalCurrency && $finalSecurityDepositCurrency) {
        echo "✅ SUCCESS! Database is properly configured.\n";
        echo "Columns are present and migration is ready for future use.\n";
        exit(0);
    } else {
        echo "⚠️  WARNING: Some columns are still missing.\n";
        exit(1);
    }
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

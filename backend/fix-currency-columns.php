<?php
/**
 * Fix currency columns - Direct SQL execution
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
echo "FIXING CURRENCY COLUMNS\n";
echo "========================================\n\n";

try {
    // Get database name
    $dbResult = DB::select("SELECT DATABASE() as db");
    $dbName = $dbResult[0]->db ?? 'unknown';
    echo "Database: {$dbName}\n\n";
    
    // Check if table exists
    if (!Schema::hasTable('units')) {
        die("ERROR: 'units' table does not exist!\n");
    }
    echo "✓ 'units' table exists\n\n";
    
    // Add currency column
    echo "Adding 'currency' column...\n";
    try {
        if (!Schema::hasColumn('units', 'currency')) {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            echo "  ✓ Added 'currency' column\n";
        } else {
            echo "  ✓ 'currency' column already exists\n";
        }
    } catch (\Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "  ✓ Column already exists (duplicate error caught)\n";
        } else {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    // Add security_deposit_currency column
    echo "\nAdding 'security_deposit_currency' column...\n";
    try {
        if (!Schema::hasColumn('units', 'security_deposit_currency')) {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            echo "  ✓ Added 'security_deposit_currency' column\n";
        } else {
            echo "  ✓ 'security_deposit_currency' column already exists\n";
        }
    } catch (\Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "  ✓ Column already exists (duplicate error caught)\n";
        } else {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
            throw $e;
        }
    }
    
    // Final verification
    echo "\n========================================\n";
    echo "VERIFICATION\n";
    echo "========================================\n";
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    echo ($hasCurrency ? "✓" : "✗") . " currency: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    echo ($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";
    
    if ($hasCurrency && $hasSecurityDepositCurrency) {
        echo "✅ SUCCESS! Database is fixed.\n";
        echo "You can now create units with currency fields.\n";
        exit(0);
    } else {
        echo "⚠️  WARNING: Some columns are still missing.\n";
        exit(1);
    }
    
} catch (\Exception $e) {
    echo "\n❌ FATAL ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

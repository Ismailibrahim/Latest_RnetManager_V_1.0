<?php
/**
 * Direct SQL execution - Force add columns
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "========================================\n";
echo "ADDING CURRENCY COLUMNS (FORCE MODE)\n";
echo "========================================\n\n";

try {
    // Get database info
    $dbResult = DB::select("SELECT DATABASE() as db");
    $dbName = $dbResult[0]->db ?? 'unknown';
    echo "Database: {$dbName}\n\n";
    
    // Try to add currency column (will fail if exists, but that's ok)
    echo "Adding 'currency' column...\n";
    try {
        DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
        echo "  ✓ Successfully added\n";
    } catch (\Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false || 
            strpos($e->getMessage(), 'already exists') !== false) {
            echo "  ✓ Column already exists\n";
        } else {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
        }
    }
    
    // Try to add security_deposit_currency column
    echo "\nAdding 'security_deposit_currency' column...\n";
    try {
        DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
        echo "  ✓ Successfully added\n";
    } catch (\Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false || 
            strpos($e->getMessage(), 'already exists') !== false) {
            echo "  ✓ Column already exists\n";
        } else {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
        }
    }
    
    // Verify with SHOW COLUMNS
    echo "\n========================================\n";
    echo "VERIFICATION\n";
    echo "========================================\n";
    $columns = DB::select("SHOW COLUMNS FROM `units` WHERE Field IN ('currency', 'security_deposit_currency')");
    
    $foundCurrency = false;
    $foundSecurityDepositCurrency = false;
    
    foreach ($columns as $col) {
        if ($col->Field === 'currency') {
            $foundCurrency = true;
            echo "✓ currency: EXISTS (" . $col->Type . ")\n";
        }
        if ($col->Field === 'security_deposit_currency') {
            $foundSecurityDepositCurrency = true;
            echo "✓ security_deposit_currency: EXISTS (" . $col->Type . ")\n";
        }
    }
    
    if (!$foundCurrency) {
        echo "✗ currency: MISSING\n";
    }
    if (!$foundSecurityDepositCurrency) {
        echo "✗ security_deposit_currency: MISSING\n";
    }
    
    echo "\n";
    if ($foundCurrency && $foundSecurityDepositCurrency) {
        echo "✅ SUCCESS! Both columns are now present.\n";
        echo "You can now create units with currency fields.\n";
    } else {
        echo "⚠️  Some columns are still missing. Check errors above.\n";
    }
    
} catch (\Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

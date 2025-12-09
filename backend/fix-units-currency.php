<?php
/**
 * Direct script to add currency columns to units table
 * Run: php fix-units-currency.php
 */

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "=== Adding Currency Columns to Units Table ===\n\n";

try {
    // Check if table exists
    if (!Schema::hasTable('units')) {
        die("❌ ERROR: 'units' table does not exist!\n");
    }
    echo "✓ 'units' table exists\n\n";

    // Check and add currency column
    if (!Schema::hasColumn('units', 'currency')) {
        echo "Adding 'currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            echo "  ✓ Successfully added 'currency' column\n";
        } catch (\Exception $e) {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
        }
    } else {
        echo "✓ 'currency' column already exists\n";
    }

    // Check and add security_deposit_currency column
    if (!Schema::hasColumn('units', 'security_deposit_currency')) {
        echo "Adding 'security_deposit_currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            echo "  ✓ Successfully added 'security_deposit_currency' column\n";
        } catch (\Exception $e) {
            echo "  ✗ Error: " . $e->getMessage() . "\n";
        }
    } else {
        echo "✓ 'security_deposit_currency' column already exists\n";
    }

    echo "\n=== Verification ===\n";
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');

    echo ($hasCurrency ? "✓" : "✗") . " currency column: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    echo ($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency column: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";

    if ($hasCurrency && $hasSecurityDepositCurrency) {
        echo "✅ SUCCESS! Database is now updated with currency columns.\n";
        echo "You can now create units with currency fields.\n";
    } else {
        echo "⚠️  WARNING: Some columns are still missing.\n";
        echo "Please check the errors above and try running the SQL manually.\n";
    }

} catch (\Exception $e) {
    echo "❌ FATAL ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

try {
    if (!Schema::hasTable('units')) {
        echo "ERROR: units table does not exist.\n";
        exit(1);
    }

    echo "=== Checking units table columns ===\n\n";

    $currencyExists = Schema::hasColumn('units', 'currency');
    $securityDepositCurrencyExists = Schema::hasColumn('units', 'security_deposit_currency');

    echo "Current status:\n";
    echo ($currencyExists ? "✓" : "✗") . " 'currency' column: " . ($currencyExists ? "EXISTS" : "MISSING") . "\n";
    echo ($securityDepositCurrencyExists ? "✓" : "✗") . " 'security_deposit_currency' column: " . ($securityDepositCurrencyExists ? "EXISTS" : "MISSING") . "\n\n";

    if (!$currencyExists) {
        echo "Adding 'currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            echo "✓ Successfully added 'currency' column\n";
        } catch (\Exception $e) {
            echo "✗ Failed to add 'currency' column: " . $e->getMessage() . "\n";
        }
    }

    if (!$securityDepositCurrencyExists) {
        echo "Adding 'security_deposit_currency' column...\n";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            echo "✓ Successfully added 'security_deposit_currency' column\n";
        } catch (\Exception $e) {
            echo "✗ Failed to add 'security_deposit_currency' column: " . $e->getMessage() . "\n";
        }
    }

    // Verify final status
    echo "\n=== Final verification ===\n";
    $finalCurrencyExists = Schema::hasColumn('units', 'currency');
    $finalSecurityDepositCurrencyExists = Schema::hasColumn('units', 'security_deposit_currency');

    echo ($finalCurrencyExists ? "✓" : "✗") . " 'currency' column: " . ($finalCurrencyExists ? "EXISTS" : "MISSING") . "\n";
    echo ($finalSecurityDepositCurrencyExists ? "✓" : "✗") . " 'security_deposit_currency' column: " . ($finalSecurityDepositCurrencyExists ? "EXISTS" : "MISSING") . "\n\n";

    if ($finalCurrencyExists && $finalSecurityDepositCurrencyExists) {
        echo "✅ SUCCESS: All currency columns are now present in the database!\n";
        exit(0);
    } else {
        echo "⚠️  WARNING: Some columns are still missing. Please check the errors above.\n";
        exit(1);
    }
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

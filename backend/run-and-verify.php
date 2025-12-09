<?php
/**
 * Run migration fix and verify, output to file
 */

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$output = [];
$output[] = "========================================";
$output[] = "DATABASE VERIFICATION & FIX";
$output[] = "Date: " . date('Y-m-d H:i:s');
$output[] = "========================================";
$output[] = "";

try {
    // Check table
    if (!Schema::hasTable('units')) {
        $output[] = "❌ ERROR: 'units' table does not exist!";
        file_put_contents(__DIR__ . '/verification-result.txt', implode("\n", $output));
        echo implode("\n", $output);
        exit(1);
    }
    $output[] = "✓ 'units' table exists";
    $output[] = "";

    // Check currency column
    $currencyExists = Schema::hasColumn('units', 'currency');
    $output[] = "Checking 'currency' column...";
    
    if (!$currencyExists) {
        $output[] = "  Column MISSING - Adding now...";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            $output[] = "  ✓ Successfully added 'currency' column";
            $currencyExists = true;
        } catch (\Exception $e) {
            $output[] = "  ✗ Error: " . $e->getMessage();
        }
    } else {
        $output[] = "  ✓ Column already exists";
    }
    $output[] = "";

    // Check security_deposit_currency column
    $securityDepositCurrencyExists = Schema::hasColumn('units', 'security_deposit_currency');
    $output[] = "Checking 'security_deposit_currency' column...";
    
    if (!$securityDepositCurrencyExists) {
        $output[] = "  Column MISSING - Adding now...";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            $output[] = "  ✓ Successfully added 'security_deposit_currency' column";
            $securityDepositCurrencyExists = true;
        } catch (\Exception $e) {
            $output[] = "  ✗ Error: " . $e->getMessage();
        }
    } else {
        $output[] = "  ✓ Column already exists";
    }
    $output[] = "";

    // Final verification
    $output[] = "========================================";
    $output[] = "FINAL VERIFICATION";
    $output[] = "========================================";
    $finalCurrency = Schema::hasColumn('units', 'currency');
    $finalSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    $output[] = ($finalCurrency ? "✓" : "✗") . " currency: " . ($finalCurrency ? "EXISTS" : "MISSING");
    $output[] = ($finalSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($finalSecurityDepositCurrency ? "EXISTS" : "MISSING");
    $output[] = "";

    if ($finalCurrency && $finalSecurityDepositCurrency) {
        $output[] = "✅ SUCCESS! Database is updated.";
        $output[] = "Both currency columns are now present.";
        $output[] = "You can now create units with currency fields.";
        $status = "SUCCESS";
    } else {
        $output[] = "⚠️  WARNING: Some columns are still missing.";
        $output[] = "Please check the errors above.";
        $status = "FAILED";
    }

    $result = implode("\n", $output);
    file_put_contents(__DIR__ . '/verification-result.txt', $result);
    echo $result;
    
    exit($status === "SUCCESS" ? 0 : 1);

} catch (\Exception $e) {
    $error = "❌ FATAL ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
    file_put_contents(__DIR__ . '/verification-result.txt', $error);
    echo $error;
    exit(1);
}

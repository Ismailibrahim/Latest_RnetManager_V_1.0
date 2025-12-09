<?php
/**
 * Verify database and add currency columns
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$output = [];
$output[] = "========================================";
$output[] = "DATABASE VERIFICATION & FIX";
$output[] = "========================================";
$output[] = "";

try {
    // Get current database name
    $dbName = DB::select("SELECT DATABASE() as db")[0]->db ?? 'unknown';
    $output[] = "Current Database: {$dbName}";
    $output[] = "";
    
    // Check if units table exists
    $tableExists = Schema::hasTable('units');
    $output[] = "Table 'units' exists: " . ($tableExists ? "YES" : "NO");
    $output[] = "";
    
    if (!$tableExists) {
        $output[] = "ERROR: units table does not exist!";
        echo implode("\n", $output);
        exit(1);
    }
    
    // Check columns
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    $output[] = "Column Status:";
    $output[] = "  currency: " . ($hasCurrency ? "EXISTS" : "MISSING");
    $output[] = "  security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING");
    $output[] = "";
    
    // Add missing columns
    if (!$hasCurrency) {
        $output[] = "Adding 'currency' column...";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            $output[] = "  ✓ Added successfully";
            $hasCurrency = true;
        } catch (\Exception $e) {
            $output[] = "  ✗ Error: " . $e->getMessage();
        }
    }
    
    if (!$hasSecurityDepositCurrency) {
        $output[] = "Adding 'security_deposit_currency' column...";
        try {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            $output[] = "  ✓ Added successfully";
            $hasSecurityDepositCurrency = true;
        } catch (\Exception $e) {
            $output[] = "  ✗ Error: " . $e->getMessage();
        }
    }
    
    $output[] = "";
    $output[] = "Final Status:";
    $finalCurrency = Schema::hasColumn('units', 'currency');
    $finalSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    $output[] = "  currency: " . ($finalCurrency ? "EXISTS ✓" : "MISSING ✗");
    $output[] = "  security_deposit_currency: " . ($finalSecurityDepositCurrency ? "EXISTS ✓" : "MISSING ✗");
    $output[] = "";
    
    if ($finalCurrency && $finalSecurityDepositCurrency) {
        $output[] = "✅ SUCCESS! Database is ready.";
    } else {
        $output[] = "⚠️  WARNING: Some columns are still missing.";
    }
    
    $result = implode("\n", $output);
    echo $result;
    file_put_contents(__DIR__ . '/db-verification-result.txt', $result);
    
} catch (\Exception $e) {
    $error = "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
    echo $error;
    file_put_contents(__DIR__ . '/db-verification-result.txt', $error);
    exit(1);
}

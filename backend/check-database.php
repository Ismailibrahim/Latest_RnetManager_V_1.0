<?php
/**
 * Check database connection and verify columns
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

print "========================================\n";
print "DATABASE CONNECTION CHECK\n";
print "========================================\n\n";

try {
    // Get database configuration
    $connection = config('database.default');
    $host = config("database.connections.{$connection}.host");
    $database = config("database.connections.{$connection}.database");
    $username = config("database.connections.{$connection}.username");
    $port = config("database.connections.{$connection}.port");
    
    print "Connection Type: {$connection}\n";
    print "Host: {$host}\n";
    print "Port: {$port}\n";
    print "Database Name: {$database}\n";
    print "Username: {$username}\n";
    print "\n";

    // Test connection
    print "Testing connection...\n";
    DB::connection()->getPdo();
    print "✓ Connected successfully\n\n";

    // Check if units table exists
    print "Checking 'units' table...\n";
    if (!Schema::hasTable('units')) {
        die("✗ ERROR: 'units' table does not exist in database '{$database}'!\n");
    }
    print "✓ 'units' table exists\n\n";

    // List all columns
    print "Current columns in 'units' table:\n";
    print str_repeat("-", 50) . "\n";
    $columns = DB::select("SHOW COLUMNS FROM `units`");
    foreach ($columns as $col) {
        $null = $col->Null === 'YES' ? 'NULL' : 'NOT NULL';
        $default = $col->Default !== null ? " DEFAULT '{$col->Default}'" : '';
        print sprintf("%-30s %-20s %s%s\n", $col->Field, $col->Type, $null, $default);
    }
    print str_repeat("-", 50) . "\n\n";

    // Check for currency columns
    print "Checking currency columns...\n";
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    print ($hasCurrency ? "✓" : "✗") . " 'currency' column: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    print ($hasSecurityDepositCurrency ? "✓" : "✗") . " 'security_deposit_currency' column: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";

    if (!$hasCurrency || !$hasSecurityDepositCurrency) {
        print "========================================\n";
        print "ADDING MISSING COLUMNS\n";
        print "========================================\n\n";
        
        if (!$hasCurrency) {
            print "Adding 'currency' column...\n";
            try {
                DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
                print "  ✓ Successfully added\n";
            } catch (\Exception $e) {
                print "  ✗ Error: " . $e->getMessage() . "\n";
            }
        }
        
        if (!$hasSecurityDepositCurrency) {
            print "Adding 'security_deposit_currency' column...\n";
            try {
                DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
                print "  ✓ Successfully added\n";
            } catch (\Exception $e) {
                print "  ✗ Error: " . $e->getMessage() . "\n";
            }
        }
        
        print "\nFinal verification...\n";
        $finalCurrency = Schema::hasColumn('units', 'currency');
        $finalSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
        
        print ($finalCurrency ? "✓" : "✗") . " 'currency': " . ($finalCurrency ? "EXISTS" : "MISSING") . "\n";
        print ($finalSecurityDepositCurrency ? "✓" : "✗") . " 'security_deposit_currency': " . ($finalSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";
        
        if ($finalCurrency && $finalSecurityDepositCurrency) {
            print "✅ SUCCESS! All columns are now present.\n";
        } else {
            print "⚠️  Some columns are still missing. Check errors above.\n";
        }
    } else {
        print "✅ All currency columns are present!\n";
    }

} catch (\Exception $e) {
    print "❌ ERROR: " . $e->getMessage() . "\n";
    print "\nStack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

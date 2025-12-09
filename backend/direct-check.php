<?php
// Simple direct check
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

print "=== DATABASE VERIFICATION ===\n\n";

$currencyExists = Schema::hasColumn('units', 'currency');
$securityDepositCurrencyExists = Schema::hasColumn('units', 'security_deposit_currency');

print "Currency column exists: " . ($currencyExists ? "YES ✓\n" : "NO ✗\n");
print "Security deposit currency column exists: " . ($securityDepositCurrencyExists ? "YES ✓\n" : "NO ✗\n");
print "\n";

if ($currencyExists && $securityDepositCurrencyExists) {
    print "✅ CONFIRMED: Database is updated!\n";
    print "Both currency columns are present.\n";
} else {
    print "❌ NOT CONFIRMED: Columns are missing!\n";
    print "Please run: php fix-units-currency.php\n";
}

print "\n";

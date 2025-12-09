<?php
// Direct SQL execution to add currency columns
error_reporting(E_ALL);
ini_set('display_errors', 1);

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

print "========================================\n";
print "ADDING CURRENCY COLUMNS TO UNITS TABLE\n";
print "========================================\n\n";

try {
    // Check if table exists
    if (!Schema::hasTable('units')) {
        die("ERROR: units table does not exist!\n");
    }
    print "✓ units table exists\n\n";

    // Add currency column
    print "Step 1: Adding 'currency' column...\n";
    try {
        if (!Schema::hasColumn('units', 'currency')) {
            DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
            print "  ✓ Added 'currency' column\n";
        } else {
            print "  ✓ 'currency' column already exists\n";
        }
    } catch (\Exception $e) {
        print "  ✗ ERROR: " . $e->getMessage() . "\n";
    }

    // Add security_deposit_currency column
    print "\nStep 2: Adding 'security_deposit_currency' column...\n";
    try {
        if (!Schema::hasColumn('units', 'security_deposit_currency')) {
            DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
            print "  ✓ Added 'security_deposit_currency' column\n";
        } else {
            print "  ✓ 'security_deposit_currency' column already exists\n";
        }
    } catch (\Exception $e) {
        print "  ✗ ERROR: " . $e->getMessage() . "\n";
    }

    // Verify
    print "\n========================================\n";
    print "VERIFICATION\n";
    print "========================================\n";
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');

    print ($hasCurrency ? "✓" : "✗") . " currency: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    print ($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";

    if ($hasCurrency && $hasSecurityDepositCurrency) {
        print "✅ SUCCESS! Columns added successfully.\n";
        print "You can now create units with currency fields.\n";
    } else {
        print "⚠️  WARNING: Some columns are still missing.\n";
    }

} catch (\Exception $e) {
    print "❌ FATAL ERROR: " . $e->getMessage() . "\n";
    print $e->getTraceAsString() . "\n";
    exit(1);
}

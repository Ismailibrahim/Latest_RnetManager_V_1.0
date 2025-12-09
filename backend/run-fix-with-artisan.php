<?php
/**
 * Run migration fix using Laravel's database connection
 * This can be run via: php artisan tinker < run-fix-with-artisan.php
 * Or: php -r "require 'vendor/autoload.php'; require 'run-fix-with-artisan.php';"
 */

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "========================================\n";
echo "FIXING CURRENCY COLUMNS\n";
echo "========================================\n\n";

try {
    $db = DB::select("SELECT DATABASE() as db")[0]->db;
    echo "Database: {$db}\n\n";
    
    // Add currency column
    if (!Schema::hasColumn('units', 'currency')) {
        echo "Adding 'currency' column...\n";
        DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
        echo "✓ Added\n";
    } else {
        echo "✓ 'currency' column already exists\n";
    }
    
    // Add security_deposit_currency column
    if (!Schema::hasColumn('units', 'security_deposit_currency')) {
        echo "Adding 'security_deposit_currency' column...\n";
        DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
        echo "✓ Added\n";
    } else {
        echo "✓ 'security_deposit_currency' column already exists\n";
    }
    
    // Record migration
    $migrationName = '2025_01_21_000000_add_currency_fields_to_units_table';
    $exists = DB::table('migrations')->where('migration', $migrationName)->exists();
    
    if (!$exists) {
        echo "\nRecording migration...\n";
        $batch = DB::table('migrations')->max('batch') ?? 0;
        DB::table('migrations')->insert([
            'migration' => $migrationName,
            'batch' => $batch + 1
        ]);
        echo "✓ Recorded\n";
    } else {
        echo "\n✓ Migration already recorded\n";
    }
    
    // Verify
    echo "\n========================================\n";
    echo "VERIFICATION\n";
    echo "========================================\n";
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    echo ($hasCurrency ? "✓" : "✗") . " currency: " . ($hasCurrency ? "EXISTS" : "MISSING") . "\n";
    echo ($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING") . "\n\n";
    
    if ($hasCurrency && $hasSecurityDepositCurrency) {
        echo "✅ SUCCESS! Database is fixed.\n";
    } else {
        echo "⚠️  Some columns are missing.\n";
    }
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

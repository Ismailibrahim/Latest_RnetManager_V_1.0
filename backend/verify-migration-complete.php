<?php
/**
 * Complete verification of migration status
 */
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$results = [];
$results[] = "========================================";
$results[] = "MIGRATION VERIFICATION";
$results[] = "========================================";
$results[] = "";

try {
    $db = DB::select("SELECT DATABASE() as db")[0]->db;
    $results[] = "Database: {$db}";
    $results[] = "";
    
    // Check migration record
    $migrationName = '2025_01_21_000000_add_currency_fields_to_units_table';
    $migrationRecorded = DB::table('migrations')->where('migration', $migrationName)->exists();
    $results[] = "Migration recorded: " . ($migrationRecorded ? "YES ✓" : "NO ✗");
    $results[] = "";
    
    // Check columns
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');
    
    $results[] = "Column Status:";
    $results[] = "  currency: " . ($hasCurrency ? "EXISTS ✓" : "MISSING ✗");
    $results[] = "  security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS ✓" : "MISSING ✗");
    $results[] = "";
    
    // Get column details if they exist
    if ($hasCurrency || $hasSecurityDepositCurrency) {
        $results[] = "Column Details:";
        $cols = DB::select("SHOW COLUMNS FROM `units` WHERE Field IN ('currency', 'security_deposit_currency')");
        foreach ($cols as $col) {
            $results[] = "  {$col->Field}: {$col->Type} ({$col->Null})";
        }
        $results[] = "";
    }
    
    // Summary
    if ($hasCurrency && $hasSecurityDepositCurrency) {
        $results[] = "✅ STATUS: COMPLETE";
        $results[] = "All currency columns are present.";
        if ($migrationRecorded) {
            $results[] = "Migration is properly recorded.";
        } else {
            $results[] = "⚠️  Migration not recorded (but columns exist).";
        }
    } else {
        $results[] = "❌ STATUS: INCOMPLETE";
        $results[] = "Some columns are missing. Run: php fix-migration-properly.php";
    }
    
    $output = implode("\n", $results);
    echo $output;
    file_put_contents(__DIR__ . '/migration-verification.txt', $output);
    
} catch (Exception $e) {
    $error = "ERROR: " . $e->getMessage();
    echo $error;
    file_put_contents(__DIR__ . '/migration-verification.txt', $error);
}

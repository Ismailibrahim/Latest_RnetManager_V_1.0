<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$output = [];

try {
    $output[] = "=== Database Verification: units table ===";
    $output[] = "";

    if (!Schema::hasTable('units')) {
        $output[] = "❌ ERROR: units table does not exist.";
        file_put_contents(__DIR__ . '/verification-result.txt', implode("\n", $output));
        exit(1);
    }

    $output[] = "✓ units table exists";
    $output[] = "";

    // Check for currency columns
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');

    $output[] = "Column Status:";
    $output[] = str_repeat("-", 50);
    $output[] = ($hasCurrency ? "✓" : "✗") . " currency: " . ($hasCurrency ? "EXISTS" : "MISSING");
    $output[] = ($hasSecurityDepositCurrency ? "✓" : "✗") . " security_deposit_currency: " . ($hasSecurityDepositCurrency ? "EXISTS" : "MISSING");
    $output[] = str_repeat("-", 50);
    $output[] = "";

    if ($hasCurrency && $hasSecurityDepositCurrency) {
        $output[] = "✅ SUCCESS: All currency columns are present!";
        $output[] = "";
        $output[] = "The database is ready to use currency fields.";
    } else {
        $output[] = "⚠️  WARNING: Missing columns detected.";
        $output[] = "";
        $output[] = "Please run: php add-currency-columns.php";
    }

    // Get column details
    $output[] = "";
    $output[] = "All columns in units table:";
    $output[] = str_repeat("-", 50);
    $columns = DB::select("SHOW COLUMNS FROM `units`");
    foreach ($columns as $col) {
        $output[] = sprintf("%-30s %-20s", $col->Field, $col->Type);
    }

    $result = implode("\n", $output);
    echo $result;
    file_put_contents(__DIR__ . '/verification-result.txt', $result);

    exit($hasCurrency && $hasSecurityDepositCurrency ? 0 : 1);

} catch (\Exception $e) {
    $error = "❌ ERROR: " . $e->getMessage();
    echo $error;
    file_put_contents(__DIR__ . '/verification-result.txt', $error);
    exit(1);
}

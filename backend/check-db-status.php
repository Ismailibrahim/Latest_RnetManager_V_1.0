<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$results = [];
$results[] = "=== Database Status Check ===";
$results[] = "Date: " . date('Y-m-d H:i:s');
$results[] = "";

try {
    // Check table exists
    $tableExists = Schema::hasTable('units');
    $results[] = "Table 'units' exists: " . ($tableExists ? "YES ✓" : "NO ✗");
    $results[] = "";

    if ($tableExists) {
        // Check columns
        $currencyExists = Schema::hasColumn('units', 'currency');
        $securityDepositCurrencyExists = Schema::hasColumn('units', 'security_deposit_currency');

        $results[] = "Column Status:";
        $results[] = "  currency: " . ($currencyExists ? "EXISTS ✓" : "MISSING ✗");
        $results[] = "  security_deposit_currency: " . ($securityDepositCurrencyExists ? "EXISTS ✓" : "MISSING ✗");
        $results[] = "";

        // Get all columns
        $results[] = "All columns in 'units' table:";
        try {
            $columns = DB::select("SHOW COLUMNS FROM `units`");
            foreach ($columns as $col) {
                $results[] = sprintf("  - %s (%s)", $col->Field, $col->Type);
            }
        } catch (\Exception $e) {
            $results[] = "  Error getting columns: " . $e->getMessage();
        }

        $results[] = "";
        if ($currencyExists && $securityDepositCurrencyExists) {
            $results[] = "✅ CONFIRMED: Database is updated with currency columns!";
            $results[] = "Status: READY";
        } else {
            $results[] = "⚠️  WARNING: Currency columns are missing!";
            $results[] = "Status: NEEDS UPDATE";
            $results[] = "";
            $results[] = "Run: php fix-units-currency.php";
        }
    } else {
        $results[] = "❌ ERROR: 'units' table does not exist!";
    }

} catch (\Exception $e) {
    $results[] = "❌ ERROR: " . $e->getMessage();
    $results[] = "Stack: " . $e->getTraceAsString();
}

$output = implode("\n", $results);
echo $output;
file_put_contents(__DIR__ . '/db-status.txt', $output);

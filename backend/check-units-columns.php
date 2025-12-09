<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

try {
    echo "=== Checking units table structure ===\n\n";
    
    if (!Schema::hasTable('units')) {
        echo "❌ ERROR: units table does not exist.\n";
        exit(1);
    }

    echo "✓ units table exists\n\n";

    // Get all columns in the units table
    $columns = DB::select("SHOW COLUMNS FROM `units`");
    
    echo "Current columns in 'units' table:\n";
    echo str_repeat("-", 60) . "\n";
    foreach ($columns as $column) {
        $field = $column->Field;
        $type = $column->Type;
        $null = $column->Null;
        $default = $column->Default ?? 'NULL';
        $key = $column->Key;
        
        echo sprintf("%-30s %-20s %-5s %-10s\n", $field, $type, $null, $default);
    }
    echo str_repeat("-", 60) . "\n\n";

    // Check specifically for currency columns
    $hasCurrency = Schema::hasColumn('units', 'currency');
    $hasSecurityDepositCurrency = Schema::hasColumn('units', 'security_deposit_currency');

    echo "Currency columns status:\n";
    echo str_repeat("-", 60) . "\n";
    echo $hasCurrency ? "✓ 'currency' column EXISTS\n" : "❌ 'currency' column MISSING\n";
    echo $hasSecurityDepositCurrency ? "✓ 'security_deposit_currency' column EXISTS\n" : "❌ 'security_deposit_currency' column MISSING\n";
    echo str_repeat("-", 60) . "\n\n";

    if ($hasCurrency && $hasSecurityDepositCurrency) {
        echo "✅ SUCCESS: All currency columns are present in the database!\n";
        exit(0);
    } else {
        echo "⚠️  WARNING: Some currency columns are missing. Run the migration to add them.\n";
        exit(1);
    }
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

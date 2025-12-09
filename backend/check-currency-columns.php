<?php

// Disable all output buffering
if (ob_get_level()) {
    ob_end_clean();
}
ob_implicit_flush(true);

// Force immediate output
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');
ini_set('implicit_flush', '1');

error_reporting(E_ALL);
ini_set('display_errors', '1');

// Force UTF-8 output
header('Content-Type: text/plain; charset=utf-8');

function flushOutput($text) {
    echo $text;
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
}

try {
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

    use Illuminate\Support\Facades\DB;
} catch (\Exception $e) {
    flushOutput("Error bootstrapping: " . $e->getMessage() . "\n");
    exit(1);
}

$output = [];
$output[] = "==========================================";
$output[] = "Checking Currency Columns in Database";
$output[] = "==========================================";
$output[] = "";

// Check tenant_units
$r1 = DB::select("SHOW COLUMNS FROM tenant_units WHERE Field = 'currency'");
$tenantExists = count($r1) > 0;
$output[] = "1. tenant_units.currency: " . ($tenantExists ? "✅ EXISTS" : "❌ NOT FOUND");
if ($tenantExists && !empty($r1)) {
    $col = $r1[0];
    $output[] = "   Type: " . ($col->Type ?? 'N/A');
    $output[] = "   Null: " . ($col->Null ?? 'N/A');
    $output[] = "   Default: " . ($col->Default ?? 'N/A');
}

$output[] = "";

// Check financial_records
$r2 = DB::select("SHOW COLUMNS FROM financial_records WHERE Field = 'currency'");
$financialExists = count($r2) > 0;
$output[] = "2. financial_records.currency: " . ($financialExists ? "✅ EXISTS" : "❌ NOT FOUND");
if ($financialExists && !empty($r2)) {
    $col = $r2[0];
    $output[] = "   Type: " . ($col->Type ?? 'N/A');
    $output[] = "   Null: " . ($col->Null ?? 'N/A');
    $output[] = "   Default: " . ($col->Default ?? 'N/A');
}

$output[] = "";
$output[] = "==========================================";
if ($tenantExists && $financialExists) {
    $output[] = "✅ SUCCESS: Both columns exist!";
} else {
    $output[] = "⚠️  WARNING: Some columns are missing.";
    if (!$tenantExists) $output[] = "   - tenant_units.currency is missing";
    if (!$financialExists) $output[] = "   - financial_records.currency is missing";
}
$output[] = "==========================================";

// Output to both console and file
$result = implode("\n", $output);
flushOutput($result . "\n");

// Also write to file
file_put_contents(__DIR__ . '/check-result.txt', $result);

// Force final flush
if (ob_get_level() > 0) {
    ob_end_flush();
}
flush();

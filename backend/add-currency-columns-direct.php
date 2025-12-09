<?php
// Direct SQL execution to add currency columns
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$output = [];
$output[] = "==========================================";
$output[] = "Adding Currency Columns Directly";
$output[] = "==========================================";
$output[] = "";

try {
    // Check and add tenant_units.currency
    $output[] = "1. Checking tenant_units table...";
    $check = DB::select("SHOW COLUMNS FROM tenant_units WHERE Field = 'currency'");
    
    if (empty($check)) {
        $output[] = "   Adding currency column...";
        DB::statement("ALTER TABLE `tenant_units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `monthly_rent`");
        $output[] = "   ✅ Column added";
        
        // Update existing records
        $updated = DB::update("UPDATE tenant_units tu INNER JOIN units u ON tu.unit_id = u.id SET tu.currency = COALESCE(u.currency, 'MVR') WHERE tu.currency = 'MVR'");
        $output[] = "   ✅ Updated $updated records";
    } else {
        $output[] = "   ⚠️  Column already exists";
    }
    
    $output[] = "";
     // Check and add financial_records.currency
     $output[] = "2. Checking financial_records table...";
     $check = DB::select("SHOW COLUMNS FROM financial_records WHERE Field = 'currency'");
     
     if (empty($check)) {
         $output[] = "   Adding currency column...";
         DB::statement("ALTER TABLE `financial_records` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `amount`");
         $output[] = "   ✅ Column added";
         
         // Update existing records
         $updated = DB::update("UPDATE financial_records fr INNER JOIN tenant_units tu ON fr.tenant_unit_id = tu.id SET fr.currency = COALESCE(tu.currency, 'MVR') WHERE fr.tenant_unit_id IS NOT NULL");
         $output[] = "   ✅ Updated $updated records";
     } else {
         $output[] = "   ⚠️  Column already exists";
     }
     
     $output[] = "";
     $output[] = "==========================================";
     $output[] = "Verification:";
     $output[] = "==========================================";
     
     // Verify
     $tenantCheck = DB::select("SHOW COLUMNS FROM tenant_units WHERE Field = 'currency'");
     $financialCheck = DB::select("SHOW COLUMNS FROM financial_records WHERE Field = 'currency'");
     
     $output[] = "tenant_units.currency: " . (empty($tenantCheck) ? "NOT FOUND" : "EXISTS");
     $output[] = "financial_records.currency: " . (empty($financialCheck) ? "NOT FOUND" : "EXISTS");
     
     if (!empty($tenantCheck) && !empty($financialCheck)) {
         $output[] = "";
         $output[] = "✅ SUCCESS: Both columns exist!";
     } else {
         $output[] = "";
         $output[] = "❌ ERROR: Columns still missing";
     }
     
} catch (\Exception $e) {
    $output[] = "";
    $output[] = "❌ ERROR: " . $e->getMessage();
    $output[] = "File: " . $e->getFile();
    $output[] = "Line: " . $e->getLine();
    $output[] = "Trace: " . $e->getTraceAsString();
}

$result = implode("\n", $output);
echo $result . "\n";
file_put_contents(__DIR__ . '/add-currency-result.txt', $result);

// Also create a simple status file
$status = [
    'tenant_units' => !empty($tenantCheck ?? []),
    'financial_records' => !empty($financialCheck ?? []),
    'success' => (!empty($tenantCheck ?? []) && !empty($financialCheck ?? []))
];
file_put_contents(__DIR__ . '/currency-status.json', json_encode($status, JSON_PRETTY_PRINT));
    
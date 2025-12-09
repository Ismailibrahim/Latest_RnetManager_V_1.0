<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$log = [];
$log[] = "Starting fix...";

try {
    $db = DB::select("SELECT DATABASE() as db")[0]->db;
    $log[] = "Database: " . $db;
    
    // Add currency
    try {
        DB::statement("ALTER TABLE `units` ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'MVR' AFTER `rent_amount`");
        $log[] = "Added currency column";
    } catch (Exception $e) {
        $log[] = "Currency: " . (strpos($e->getMessage(), 'Duplicate') !== false ? "Already exists" : $e->getMessage());
    }
    
    // Add security_deposit_currency
    try {
        DB::statement("ALTER TABLE `units` ADD COLUMN `security_deposit_currency` VARCHAR(3) NULL AFTER `security_deposit`");
        $log[] = "Added security_deposit_currency column";
    } catch (Exception $e) {
        $log[] = "Security deposit currency: " . (strpos($e->getMessage(), 'Duplicate') !== false ? "Already exists" : $e->getMessage());
    }
    
    // Verify
    $cols = DB::select("SHOW COLUMNS FROM `units` WHERE Field IN ('currency', 'security_deposit_currency')");
    $log[] = "Verification: Found " . count($cols) . " columns";
    foreach ($cols as $col) {
        $log[] = "  - " . $col->Field . " (" . $col->Type . ")";
    }
    
    $result = implode("\n", $log);
    file_put_contents(__DIR__ . '/fix-result.txt', $result);
    echo $result;
    
} catch (Exception $e) {
    $error = "ERROR: " . $e->getMessage();
    file_put_contents(__DIR__ . '/fix-result.txt', $error);
    echo $error;
}

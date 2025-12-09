<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SubscriptionLimit;
use Illuminate\Support\Facades\DB;

echo "Testing Subscription Limits...\n\n";

// Check if table exists
$tableExists = DB::getSchemaBuilder()->hasTable('subscription_limits');
echo "Table exists: " . ($tableExists ? "YES" : "NO") . "\n";

if ($tableExists) {
    // Count records
    $count = DB::table('subscription_limits')->count();
    echo "Record count: {$count}\n\n";
    
    if ($count > 0) {
        // Get all records
        $records = DB::table('subscription_limits')->get();
        echo "Records:\n";
        foreach ($records as $record) {
            echo "  - Tier: {$record->tier}, Properties: {$record->max_properties}, Units: {$record->max_units}, Users: {$record->max_users}, Price: {$record->monthly_price}\n";
        }
    } else {
        echo "No records found in database.\n";
    }
    
    // Test model
    echo "\nTesting Model:\n";
    $limits = SubscriptionLimit::all();
    echo "Model count: " . $limits->count() . "\n";
    
    if ($limits->count() > 0) {
        foreach ($limits as $limit) {
            echo "  - Tier: {$limit->tier}, Properties: {$limit->max_properties}\n";
        }
    }
} else {
    echo "Table does not exist. Run migrations first.\n";
}

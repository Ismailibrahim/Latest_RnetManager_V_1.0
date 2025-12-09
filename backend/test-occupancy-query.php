<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TenantUnit;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

echo "Testing Occupancy Report Queries\n";
echo "================================\n\n";

// Simulate authenticated user (super admin to bypass scopes)
$user = \App\Models\User::where('role', 'super_admin')->first();
if ($user) {
    Auth::login($user);
    echo "Authenticated as: " . $user->email . "\n\n";
}

try {
    // Test 1: Simple count distinct
    echo "Test 1: Simple COUNT(DISTINCT unit_id)\n";
    $query1 = TenantUnit::query()->where('status', 'active');
    $result1 = $query1->selectRaw('COUNT(DISTINCT unit_id) as count')->first();
    echo "Result: " . ($result1 ? $result1->count : 'null') . "\n";
    echo "Type: " . gettype($result1) . "\n";
    if ($result1) {
        echo "Has count property: " . (property_exists($result1, 'count') ? 'yes' : 'no') . "\n";
        echo "Object dump: ";
        var_dump($result1);
    }
    echo "\n";

    // Test 2: Using DB::raw in count
    echo "Test 2: Using DB::raw in count()\n";
    try {
        $count2 = TenantUnit::query()
            ->where('status', 'active')
            ->count(DB::raw('DISTINCT unit_id'));
        echo "Result: $count2\n";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 3: Using value() instead of first()
    echo "Test 3: Using selectRaw with value()\n";
    try {
        $count3 = TenantUnit::query()
            ->where('status', 'active')
            ->selectRaw('COUNT(DISTINCT unit_id) as count')
            ->value('count');
        echo "Result: " . ($count3 ?? 'null') . "\n";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 4: Using DB facade directly
    echo "Test 4: Using DB facade directly\n";
    try {
        $count4 = DB::table('tenant_units')
            ->where('status', 'active')
            ->selectRaw('COUNT(DISTINCT unit_id) as count')
            ->value('count');
        echo "Result: " . ($count4 ?? 'null') . "\n";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 5: Check if there are any tenant units
    echo "Test 5: Total active tenant units\n";
    $total = TenantUnit::where('status', 'active')->count();
    echo "Total active tenant units: $total\n";
    echo "\n";

    // Test 6: Get distinct unit_ids manually
    echo "Test 6: Get distinct unit_ids and count\n";
    $distinctUnits = TenantUnit::where('status', 'active')
        ->distinct()
        ->pluck('unit_id')
        ->unique()
        ->count();
    echo "Distinct unit_ids: $distinctUnits\n";
    echo "\n";

} catch (\Throwable $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}

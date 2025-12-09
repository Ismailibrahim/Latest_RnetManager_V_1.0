<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Unit;
use App\Models\TenantUnit;
use Carbon\Carbon;

echo "Testing Occupancy Report Controller Logic\n";
echo "==========================================\n\n";

// Simulate authenticated user (super admin to bypass scopes)
$user = User::where('role', 'super_admin')->first();
if ($user) {
    Auth::login($user);
    echo "Authenticated as: " . $user->email . "\n\n";
} else {
    echo "ERROR: No super admin user found!\n";
    exit(1);
}

try {
    $landlordId = $user->isSuperAdmin() ? null : null; // Super admin, so null
    
    echo "Step 1: Testing getOverallMetrics()\n";
    echo "-----------------------------------\n";
    
    // Get total units
    $unitsQuery = Unit::query();
    if ($landlordId !== null) {
        $unitsQuery->where('landlord_id', $landlordId);
    }
    $totalUnits = $unitsQuery->count();
    echo "Total units: $totalUnits\n";
    
    // Get occupied units (active tenant units) - using DB facade for reliability
    echo "\nTesting occupied units query...\n";
    $occupiedQuery = DB::table('tenant_units')
        ->where('status', 'active');
    if ($landlordId !== null) {
        $occupiedQuery->where('landlord_id', $landlordId);
    }
    
    echo "Query SQL: " . $occupiedQuery->selectRaw('COUNT(DISTINCT unit_id) as count')->toSql() . "\n";
    echo "Query bindings: " . json_encode($occupiedQuery->getBindings()) . "\n";
    
    try {
        $occupiedUnits = (int) $occupiedQuery->selectRaw('COUNT(DISTINCT unit_id) as count')->value('count') ?: 0;
        echo "Occupied units: $occupiedUnits\n";
    } catch (\Exception $e) {
        echo "ERROR in occupied units query: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
        echo "Trace:\n" . $e->getTraceAsString() . "\n";
        exit(1);
    }
    
    echo "\nStep 2: Testing getVacancyTrends()\n";
    echo "-----------------------------------\n";
    
    $startDate = Carbon::now()->startOfMonth();
    $endDate = Carbon::now()->endOfMonth();
    $current = $startDate->copy()->startOfMonth();
    $monthEnd = $current->copy()->endOfMonth();
    $monthStart = $current->copy()->startOfMonth();
    
    echo "Testing vacancy trends query for month: " . $current->format('Y-m') . "\n";
    
    try {
        $occupiedUnits = (int) DB::table('tenant_units')
            ->where('status', 'active')
            ->where('lease_start', '<=', $monthEnd)
            ->where(function ($q) use ($monthStart, $monthEnd) {
                $q->whereNull('lease_end')
                    ->orWhere('lease_end', '>=', $monthStart);
            })
            ->selectRaw('COUNT(DISTINCT unit_id) as count')
            ->value('count') ?: 0;
        echo "Occupied units for month: $occupiedUnits\n";
    } catch (\Exception $e) {
        echo "ERROR in vacancy trends query: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
        echo "Trace:\n" . $e->getTraceAsString() . "\n";
        exit(1);
    }
    
    echo "\nAll tests passed!\n";
    
} catch (\Throwable $e) {
    echo "\nFATAL ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

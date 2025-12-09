<?php

/**
 * Fix security_deposit_paid for existing tenant units
 * 
 * This script syncs security_deposit_paid with actual payment records.
 * For tenant units with no actual security_deposit payments, it sets the value to 0.
 * For tenant units with payments, it sums them up and updates the field.
 * 
 * Run: php fix-security-deposit-paid.php
 * Or with dry-run: php fix-security-deposit-paid.php --dry-run
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use Illuminate\Support\Facades\DB;

$isDryRun = in_array('--dry-run', $argv ?? []);

echo "========================================\n";
echo "FIXING SECURITY DEPOSIT PAID\n";
echo "========================================\n\n";

if ($isDryRun) {
    echo "⚠️  DRY RUN MODE - No changes will be made\n\n";
}

// Get all tenant units
$tenantUnits = TenantUnit::query()->get();
$totalCount = $tenantUnits->count();

echo "Found {$totalCount} tenant unit(s) to check\n\n";

$updatedCount = 0;
$unchangedCount = 0;
$details = [];

foreach ($tenantUnits as $tenantUnit) {
    // Get actual security deposit payments for this tenant unit
    $actualPayments = UnifiedPaymentEntry::query()
        ->where('tenant_unit_id', $tenantUnit->id)
        ->where('payment_type', 'security_deposit')
        ->where('status', 'completed')
        ->sum('amount');

    $actualPaid = (float) $actualPayments;
    $currentPaid = (float) ($tenantUnit->security_deposit_paid ?? 0);

    // Only update if there's a difference
    if (abs($actualPaid - $currentPaid) > 0.01) {
        if (!$isDryRun) {
            $tenantUnit->security_deposit_paid = $actualPaid;
            $tenantUnit->save();
        }

        $updatedCount++;
        $details[] = [
            'id' => $tenantUnit->id,
            'current' => $currentPaid,
            'actual' => $actualPaid,
        ];
    } else {
        $unchangedCount++;
    }
}

// Summary
echo "========================================\n";
echo "SUMMARY\n";
echo "========================================\n";
echo "Total tenant units checked: {$totalCount}\n";
echo "Updated: {$updatedCount}\n";
echo "Unchanged: {$unchangedCount}\n\n";

if (!empty($details)) {
    echo "Details of changes:\n";
    echo str_repeat("-", 60) . "\n";
    foreach ($details as $detail) {
        echo "Tenant Unit #{$detail['id']}:\n";
        echo "  Current: " . number_format($detail['current'], 2) . "\n";
        echo "  Actual payments: " . number_format($detail['actual'], 2) . "\n";
        echo "  → " . ($isDryRun ? "Would be set to" : "Set to") . ": " . number_format($detail['actual'], 2) . "\n\n";
    }
}

if ($isDryRun) {
    echo "⚠️  This was a dry run. Run without --dry-run to apply changes.\n";
} else {
    echo "✅ Security deposit paid amounts have been synced with actual payment records.\n";
}

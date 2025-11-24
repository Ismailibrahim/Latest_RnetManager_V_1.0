<?php

/**
 * Test script to check maintenance invoice payment linking
 * Run: php test-maintenance-invoice-payment.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MaintenanceInvoice;
use App\Models\UnifiedPaymentEntry;

echo "=== Maintenance Invoice Payment Test ===\n\n";

// Get the most recent maintenance invoice
$invoice = MaintenanceInvoice::latest('id')->first();

if (!$invoice) {
    echo "No maintenance invoices found.\n";
    exit(1);
}

echo "Latest Maintenance Invoice:\n";
echo "  ID: {$invoice->id}\n";
echo "  Invoice Number: {$invoice->invoice_number}\n";
echo "  Status: {$invoice->status}\n";
echo "  Grand Total: {$invoice->grand_total}\n";
echo "  Landlord ID: {$invoice->landlord_id}\n";
echo "  Tenant Unit ID: {$invoice->tenant_unit_id}\n\n";

// Check for payments linked to this invoice
$payments = UnifiedPaymentEntry::where('source_type', 'maintenance_invoice')
    ->where('source_id', $invoice->id)
    ->orWhere(function($query) use ($invoice) {
        $query->where('source_type', 'financial_record')
            ->whereHas('metadata', function($q) use ($invoice) {
                // This won't work directly, but let's check differently
            });
    })
    ->get();

echo "Payments linked to this invoice:\n";
if ($payments->isEmpty()) {
    echo "  No payments found with source_type='maintenance_invoice' and source_id={$invoice->id}\n\n";
} else {
    foreach ($payments as $payment) {
        echo "  Payment ID: {$payment->id}\n";
        echo "    Source Type: {$payment->source_type}\n";
        echo "    Source ID: {$payment->source_id}\n";
        echo "    Amount: {$payment->amount}\n";
        echo "    Status: {$payment->status}\n";
        echo "    Created: {$payment->created_at}\n\n";
    }
}

// Check for payments by tenant_unit_id that might be linked
$paymentsByTenant = UnifiedPaymentEntry::where('tenant_unit_id', $invoice->tenant_unit_id)
    ->whereIn('status', ['completed', 'partial'])
    ->latest('id')
    ->take(5)
    ->get();

echo "Recent payments for tenant_unit_id={$invoice->tenant_unit_id}:\n";
foreach ($paymentsByTenant as $payment) {
    echo "  Payment ID: {$payment->id}\n";
    echo "    Source Type: {$payment->source_type}\n";
    echo "    Source ID: {$payment->source_id}\n";
    echo "    Amount: {$payment->amount}\n";
    echo "    Status: {$payment->status}\n";
    echo "    Description: " . ($payment->description ?? 'N/A') . "\n";
    echo "    Metadata: " . json_encode($payment->metadata ?? []) . "\n\n";
}

echo "=== End Test ===\n";


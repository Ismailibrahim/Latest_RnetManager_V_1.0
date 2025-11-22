<?php

/**
 * Quick script to check if maintenance invoice payments are being linked correctly
 * Run: php check-maintenance-invoice-payment.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MaintenanceInvoice;
use App\Models\UnifiedPaymentEntry;

echo "=== Maintenance Invoice Payment Check ===\n\n";

// Get the most recent maintenance invoice
$invoice = MaintenanceInvoice::withoutGlobalScopes()
    ->latest('id')
    ->first();

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
    ->get();

echo "Payments with source_type='maintenance_invoice' and source_id={$invoice->id}:\n";
if ($payments->isEmpty()) {
    echo "  ❌ No payments found!\n\n";
} else {
    foreach ($payments as $payment) {
        echo "  ✅ Payment ID: {$payment->id}\n";
        echo "     Source Type: {$payment->source_type}\n";
        echo "     Source ID: {$payment->source_id} (type: " . gettype($payment->source_id) . ")\n";
        echo "     Amount: {$payment->amount}\n";
        echo "     Status: {$payment->status}\n";
        echo "     Created: {$payment->created_at}\n\n";
    }
}

// Check for any payments for this tenant unit
$paymentsByTenant = UnifiedPaymentEntry::where('tenant_unit_id', $invoice->tenant_unit_id)
    ->whereIn('status', ['completed', 'partial'])
    ->latest('id')
    ->take(10)
    ->get();

echo "Recent payments for tenant_unit_id={$invoice->tenant_unit_id}:\n";
if ($paymentsByTenant->isEmpty()) {
    echo "  No payments found for this tenant unit.\n\n";
} else {
    foreach ($paymentsByTenant as $payment) {
        echo "  Payment ID: {$payment->id}\n";
        echo "    Source Type: " . ($payment->source_type ?? 'NULL') . "\n";
        echo "    Source ID: " . ($payment->source_id ?? 'NULL') . " (type: " . gettype($payment->source_id) . ")\n";
        echo "    Amount: {$payment->amount}\n";
        echo "    Status: {$payment->status}\n";
        echo "    Payment Type: {$payment->payment_type}\n";
        echo "    Description: " . ($payment->description ?? 'N/A') . "\n";
        echo "    Metadata: " . json_encode($payment->metadata ?? []) . "\n\n";
    }
}

// Check if invoice should be paid based on payments
$totalPaid = UnifiedPaymentEntry::where('source_type', 'maintenance_invoice')
    ->where('source_id', $invoice->id)
    ->whereIn('status', ['completed', 'partial'])
    ->sum('amount');

echo "Total paid for invoice {$invoice->id}: {$totalPaid}\n";
echo "Invoice grand_total: {$invoice->grand_total}\n";
echo "Should be paid: " . ($totalPaid >= $invoice->grand_total - 0.01 ? 'YES' : 'NO') . "\n";
echo "Current status: {$invoice->status}\n";

echo "\n=== End Check ===\n";


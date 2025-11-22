<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use App\Services\SystemSettingsService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TenantUnitPendingChargeController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    public function __invoke(Request $request, TenantUnit $tenantUnit)
    {
        $this->authorize('view', $tenantUnit);

        $user = $request->user();

        if ($tenantUnit->landlord_id !== $user->landlord_id) {
            abort(403, 'You are not allowed to view charges for this tenant unit.');
        }

        // Always use MVR as the currency for pending charges
        // This ensures consistency regardless of cached settings
        $currency = 'MVR';
        
        // Optionally sync settings if they're wrong (but don't block on it)
        try {
            $this->settingsService->clearCache($user->landlord_id);
            $currencySettings = $this->settingsService->getCurrencySettings($user->landlord_id);
            if (isset($currencySettings['primary']) && strtoupper($currencySettings['primary']) !== 'MVR') {
                // Fix settings in background (don't wait for it)
                $this->settingsService->updateCurrencySettings($user->landlord_id, [
                    'primary' => 'MVR',
                    'secondary' => $currencySettings['secondary'] ?? 'USD',
                    'exchange_rate' => $currencySettings['exchange_rate'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            // Ignore errors - we're already using MVR anyway
        }

        $charges = Collection::make();

        // Get all invoices for this tenant unit (regardless of status)
        $allInvoices = RentInvoice::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->get();

        // Get all completed payments linked to these invoices
        $invoiceIds = $allInvoices->pluck('id')->map(fn($id) => (int) $id)->toArray();
        
        // Initialize payment totals array
        $paymentTotals = [];
        
        // Get payments directly linked by source_id
        UnifiedPaymentEntry::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['completed', 'partial'])
            ->where('source_type', 'rent_invoice')
            ->whereNotNull('source_id')
            ->get()
            ->each(function ($payment) use (&$paymentTotals, $invoiceIds) {
                // Extract numeric invoice ID from source_id
                $sourceId = $payment->source_id;
                
                // Handle different formats of source_id
                if (is_string($sourceId) && str_contains($sourceId, ':')) {
                    [, $numericId] = explode(':', $sourceId, 2);
                    $invoiceId = (int) $numericId;
                } else {
                    $invoiceId = (int) $sourceId;
                }
                
                // Only process if invoice ID is valid and in our list
                if ($invoiceId > 0 && in_array($invoiceId, $invoiceIds, true)) {
                    $paymentTotals[$invoiceId] = ($paymentTotals[$invoiceId] ?? 0) + (float) $payment->amount;
                }
            });

        // Also check payments by invoice number in description as fallback
        UnifiedPaymentEntry::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['completed', 'partial'])
            ->whereNotNull('description')
            ->where(function ($query) {
                // Get payments that aren't already linked or aren't linked correctly
                $query->whereNull('source_type')
                      ->orWhere('source_type', '!=', 'rent_invoice')
                      ->orWhereNull('source_id');
            })
            ->get()
            ->each(function ($payment) use (&$paymentTotals, $allInvoices) {
                if (!$payment->description) {
                    return;
                }
                
                // Find matching invoice by invoice number in description
                $matchingInvoice = $allInvoices->first(function ($invoice) use ($payment) {
                    return $invoice->invoice_number && 
                           str_contains($payment->description ?? '', $invoice->invoice_number);
                });
                
                if ($matchingInvoice) {
                    $invoiceId = (int) $matchingInvoice->id;
                    $paymentTotals[$invoiceId] = ($paymentTotals[$invoiceId] ?? 0) + (float) $payment->amount;
                }
            });

        $rentInvoices = $allInvoices
            ->filter(function (RentInvoice $invoice) use ($paymentTotals) {
                // Exclude invoices with status 'paid' or 'cancelled'
                if (in_array($invoice->status, ['paid', 'cancelled'])) {
                    return false;
                }

                // Only include invoices with status 'generated', 'sent', or 'overdue'
                if (!in_array($invoice->status, ['generated', 'sent', 'overdue'])) {
                    return false;
                }

                // Check if invoice has been fully paid via payments (even if status wasn't updated)
                $invoiceAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
                $totalPaid = (float) ($paymentTotals[$invoice->id] ?? 0);

                // Exclude if fully paid via payments
                if ($totalPaid >= $invoiceAmount - 0.01) {
                    // Also update the invoice status to paid if it's not already
                    if ($invoice->status !== 'paid') {
                        $invoice->status = 'paid';
                        $invoice->paid_date = $invoice->paid_date ?? now();
                        $invoice->save();
                    }
                    return false;
                }

                return true;
            })
            ->map(function (RentInvoice $invoice) use ($currency, $paymentTotals) {
                $invoiceAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
                $totalPaid = (float) ($paymentTotals[$invoice->id] ?? 0);
                $remainingAmount = max(0, $invoiceAmount - $totalPaid);

                return [
                    'id' => sprintf('rent_invoice:%d', $invoice->id),
                    'source_type' => 'rent_invoice',
                    'source_id' => $invoice->id,
                    'tenant_unit_id' => $invoice->tenant_unit_id,
                    'title' => $invoice->invoice_number ?? 'Rent invoice',
                    'description' => $invoice->invoice_number
                        ? __('Invoice :number', ['number' => $invoice->invoice_number])
                        : 'Rent invoice',
                    'status' => $invoice->status,
                    'due_date' => optional($invoice->due_date)->toDateString(),
                    'issued_date' => optional($invoice->invoice_date)->toDateString(),
                    'amount' => $remainingAmount, // Show remaining amount if partially paid
                    'original_amount' => $invoiceAmount,
                    'currency' => $currency,
                    'payment_method' => $invoice->payment_method,
                    'metadata' => [
                        'invoice_number' => $invoice->invoice_number,
                        'rent_amount' => (float) $invoice->rent_amount,
                        'late_fee' => (float) ($invoice->late_fee ?? 0),
                        'total_paid' => $totalPaid,
                        'remaining' => $remainingAmount,
                    ],
                    'suggested_payment_type' => 'rent',
                    'supports_partial' => true,
                ];
            });

        // Get maintenance invoices for this tenant unit
        $allMaintenanceInvoices = MaintenanceInvoice::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->get();

        // Get all completed payments linked to maintenance invoices
        $maintenanceInvoiceIds = $allMaintenanceInvoices->pluck('id')->map(fn($id) => (int) $id)->toArray();
        $maintenancePaymentTotals = [];
        
        // Get payments directly linked by source_id
        UnifiedPaymentEntry::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['completed', 'partial'])
            ->where('source_type', 'maintenance_invoice')
            ->whereNotNull('source_id')
            ->get()
            ->each(function ($payment) use (&$maintenancePaymentTotals, $maintenanceInvoiceIds) {
                $sourceId = $payment->source_id;
                
                if (is_string($sourceId) && str_contains($sourceId, ':')) {
                    [, $numericId] = explode(':', $sourceId, 2);
                    $invoiceId = (int) $numericId;
                } else {
                    $invoiceId = (int) $sourceId;
                }
                
                if ($invoiceId > 0 && in_array($invoiceId, $maintenanceInvoiceIds, true)) {
                    $maintenancePaymentTotals[$invoiceId] = ($maintenancePaymentTotals[$invoiceId] ?? 0) + (float) $payment->amount;
                }
            });

        // Also check payments linked via financial records (maintenance invoices create financial records)
        UnifiedPaymentEntry::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['completed', 'partial'])
            ->where('source_type', 'financial_record')
            ->whereNotNull('source_id')
            ->get()
            ->each(function ($payment) use (&$maintenancePaymentTotals, $allMaintenanceInvoices) {
                $sourceId = $payment->source_id;
                
                if (is_string($sourceId) && str_contains($sourceId, ':')) {
                    [, $numericId] = explode(':', $sourceId, 2);
                    $recordId = (int) $numericId;
                } else {
                    $recordId = (int) $sourceId;
                }
                
                if ($recordId > 0) {
                    $record = FinancialRecord::query()->find($recordId);
                    if ($record && $record->type === 'fee' && $record->category === 'maintenance' && $record->invoice_number) {
                        $matchingInvoice = $allMaintenanceInvoices->first(function ($invoice) use ($record) {
                            return $invoice->invoice_number === $record->invoice_number;
                        });
                        
                        if ($matchingInvoice) {
                            $invoiceId = (int) $matchingInvoice->id;
                            $maintenancePaymentTotals[$invoiceId] = ($maintenancePaymentTotals[$invoiceId] ?? 0) + (float) $payment->amount;
                        }
                    }
                }
            });

        $maintenanceInvoices = $allMaintenanceInvoices
            ->filter(function (MaintenanceInvoice $invoice) use ($maintenancePaymentTotals) {
                // Exclude invoices with status 'paid' or 'cancelled'
                if (in_array($invoice->status, ['paid', 'cancelled'])) {
                    return false;
                }

                // Include invoices with status 'draft', 'sent', 'approved', or 'overdue'
                // Similar to rent invoices which include 'generated', 'sent', and 'overdue'
                if (!in_array($invoice->status, ['draft', 'sent', 'approved', 'overdue'])) {
                    return false;
                }

                // Check if invoice has been fully paid via payments
                $invoiceAmount = (float) $invoice->grand_total;
                $totalPaid = (float) ($maintenancePaymentTotals[$invoice->id] ?? 0);

                // Exclude if fully paid via payments
                if ($totalPaid >= $invoiceAmount - 0.01) {
                    // Also update the invoice status to paid if it's not already
                    if ($invoice->status !== 'paid') {
                        $invoice->status = 'paid';
                        $invoice->paid_date = $invoice->paid_date ?? now();
                        $invoice->save();
                    }
                    return false;
                }

                return true;
            })
            ->map(function (MaintenanceInvoice $invoice) use ($currency, $maintenancePaymentTotals) {
                $invoiceAmount = (float) $invoice->grand_total;
                $totalPaid = (float) ($maintenancePaymentTotals[$invoice->id] ?? 0);
                $remainingAmount = max(0, $invoiceAmount - $totalPaid);

                return [
                    'id' => sprintf('maintenance_invoice:%d', $invoice->id),
                    'source_type' => 'maintenance_invoice',
                    'source_id' => $invoice->id,
                    'tenant_unit_id' => $invoice->tenant_unit_id,
                    'title' => $invoice->invoice_number ?? 'Maintenance invoice',
                    'description' => $invoice->invoice_number
                        ? __('Invoice :number', ['number' => $invoice->invoice_number])
                        : 'Maintenance invoice',
                    'status' => $invoice->status,
                    'due_date' => optional($invoice->due_date)->toDateString(),
                    'issued_date' => optional($invoice->invoice_date)->toDateString(),
                    'amount' => $remainingAmount, // Show remaining amount if partially paid
                    'original_amount' => $invoiceAmount,
                    'currency' => $currency,
                    'payment_method' => $invoice->payment_method,
                    'metadata' => [
                        'invoice_number' => $invoice->invoice_number,
                        'grand_total' => $invoiceAmount,
                        'total_paid' => $totalPaid,
                        'remaining' => $remainingAmount,
                    ],
                    'suggested_payment_type' => 'maintenance_expense',
                    'supports_partial' => true,
                ];
            });

        $financialRecords = FinancialRecord::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['pending', 'partial'])
            // Exclude financial records that are linked to maintenance invoices (they're handled separately)
            ->where(function ($query) {
                $query->where('type', '!=', 'fee')
                      ->orWhere('category', '!=', 'maintenance');
            })
            ->orderBy('due_date')
            ->get()
            ->map(function (FinancialRecord $record) use ($currency) {
                $amount = (float) $record->amount;

                return [
                    'id' => sprintf('financial_record:%d', $record->id),
                    'source_type' => 'financial_record',
                    'source_id' => $record->id,
                    'tenant_unit_id' => $record->tenant_unit_id,
                    'title' => Str::title(str_replace('_', ' ', $record->category)),
                    'description' => $record->description,
                    'status' => $record->status,
                    'due_date' => optional($record->due_date)->toDateString(),
                    'issued_date' => optional($record->transaction_date)->toDateString(),
                    'amount' => $amount,
                    'original_amount' => $amount,
                    'currency' => $currency,
                    'payment_method' => $record->payment_method,
                    'metadata' => [
                        'category' => $record->category,
                        'type' => $record->type,
                        'invoice_number' => $record->invoice_number,
                    ],
                    'suggested_payment_type' => $this->guessPaymentTypeFromFinancialRecord($record),
                    'supports_partial' => true,
                ];
            });

        $charges = $charges
            ->merge($rentInvoices)
            ->merge($maintenanceInvoices)
            ->merge($financialRecords)
            ->sortBy(fn (array $charge) => $charge['due_date'] ?? $charge['issued_date'] ?? null)
            ->values();

        return response()->json([
            'data' => $charges,
        ]);
    }

    protected function guessPaymentTypeFromFinancialRecord(FinancialRecord $record): ?string
    {
        return match ($record->type) {
            'rent' => 'rent',
            'fee' => 'fee',
            'refund' => 'security_refund',
            'expense' => $this->mapExpenseCategoryToPaymentType($record->category),
            'security_deposit' => 'other_income',
            default => null,
        };
    }

    protected function mapExpenseCategoryToPaymentType(?string $category): string
    {
        if (in_array($category, ['maintenance', 'repair'], true)) {
            return 'maintenance_expense';
        }

        return 'other_outgoing';
    }
}



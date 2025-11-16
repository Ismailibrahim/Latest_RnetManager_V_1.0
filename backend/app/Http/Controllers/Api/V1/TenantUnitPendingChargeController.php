<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TenantUnitPendingChargeController extends Controller
{
    use AuthorizesRequests;

    public function __invoke(Request $request, TenantUnit $tenantUnit)
    {
        $this->authorize('view', $tenantUnit);

        $user = $request->user();

        if ($tenantUnit->landlord_id !== $user->landlord_id) {
            abort(403, 'You are not allowed to view charges for this tenant unit.');
        }

        $currency = config('app.currency', 'AED');

        $charges = Collection::make();

        $rentInvoices = RentInvoice::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['generated', 'sent', 'overdue'])
            ->orderBy('due_date')
            ->get()
            ->map(function (RentInvoice $invoice) use ($currency) {
                $invoiceAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);

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
                    'amount' => $invoiceAmount,
                    'original_amount' => $invoiceAmount,
                    'currency' => $currency,
                    'payment_method' => $invoice->payment_method,
                    'metadata' => [
                        'invoice_number' => $invoice->invoice_number,
                        'rent_amount' => (float) $invoice->rent_amount,
                        'late_fee' => (float) ($invoice->late_fee ?? 0),
                    ],
                    'suggested_payment_type' => 'rent',
                    'supports_partial' => true,
                ];
            });

        $financialRecords = FinancialRecord::query()
            ->where('landlord_id', $user->landlord_id)
            ->where('tenant_unit_id', $tenantUnit->id)
            ->whereIn('status', ['pending', 'partial'])
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



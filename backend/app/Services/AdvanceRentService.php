<?php

namespace App\Services;

use App\Models\FinancialRecord;
use App\Models\TenantUnit;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdvanceRentService
{
    /**
     * Check if invoice date is covered by advance rent and get coverage details.
     *
     * @return array{covered: bool, remaining: float, months_remaining: int, can_fully_cover: bool}
     */
    public function checkAdvanceRentCoverage(TenantUnit $tenantUnit, Carbon|string $invoiceDate): array
    {
        $invoiceDate = is_string($invoiceDate) ? Carbon::parse($invoiceDate) : $invoiceDate;

        if (!$tenantUnit->advance_rent_months || $tenantUnit->advance_rent_months <= 0) {
            return [
                'covered' => false,
                'remaining' => 0.0,
                'months_remaining' => 0,
                'can_fully_cover' => false,
            ];
        }

        $isCovered = $tenantUnit->isInvoiceDateCoveredByAdvanceRent($invoiceDate);
        $remaining = (float) $tenantUnit->advance_rent_remaining;
        $monthsRemaining = $tenantUnit->getAdvanceRentMonthsRemaining($invoiceDate);

        return [
            'covered' => $isCovered,
            'remaining' => $remaining,
            'months_remaining' => $monthsRemaining,
            'can_fully_cover' => $isCovered && $remaining > 0,
        ];
    }

    /**
     * Apply advance rent to an invoice and update tenant unit tracking.
     *
     * @param  \App\Models\RentInvoice  $invoice
     * @param  \App\Models\TenantUnit  $tenantUnit
     * @return array{applied: float, fully_covered: bool}
     */
    public function applyAdvanceRentToInvoice($invoice, TenantUnit $tenantUnit): array
    {
        $invoiceDate = Carbon::parse($invoice->invoice_date);
        $coverage = $this->checkAdvanceRentCoverage($tenantUnit, $invoiceDate);

        if (!$coverage['covered'] || $coverage['remaining'] <= 0) {
            return [
                'applied' => 0.0,
                'fully_covered' => false,
            ];
        }

        $invoiceAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
        $remainingAdvance = $coverage['remaining'];
        $amountToApply = min($invoiceAmount, $remainingAdvance);
        $fullyCovered = $amountToApply >= $invoiceAmount;

        // Update invoice
        $invoice->advance_rent_applied = $amountToApply;
        $invoice->is_advance_covered = $fullyCovered;

        if ($fullyCovered) {
            $invoice->status = 'paid';
            $invoice->paid_date = $invoiceDate;
        }

        // Update tenant unit tracking
        $tenantUnit->advance_rent_used = ((float) ($tenantUnit->advance_rent_used ?? 0)) + $amountToApply;
        $tenantUnit->save();

        // Save invoice
        $invoice->save();

        return [
            'applied' => $amountToApply,
            'fully_covered' => $fullyCovered,
        ];
    }

    /**
     * Collect advance rent and create financial record.
     *
     * @return array{tenant_unit: TenantUnit, financial_record: FinancialRecord}
     */
    public function collectAdvanceRent(
        TenantUnit $tenantUnit,
        int $months,
        float $amount,
        Carbon|string $transactionDate,
        ?string $currency = null,
        ?string $paymentMethod = null,
        ?string $referenceNumber = null,
        ?string $notes = null
    ): array {
        $transactionDate = is_string($transactionDate) ? Carbon::parse($transactionDate) : $transactionDate;
        
        // Default currency to unit's currency or MVR if not provided
        if (!$currency) {
            $tenantUnit->loadMissing('unit:id,currency');
            $currency = $tenantUnit->unit->currency ?? 'MVR';
        }
        
        // Normalize currency to uppercase
        $currency = strtoupper($currency ?? 'MVR');
        if (!in_array($currency, ['MVR', 'USD'], true)) {
            $currency = 'MVR';
        }

        return DB::transaction(function () use ($tenantUnit, $months, $amount, $currency, $transactionDate, $paymentMethod, $referenceNumber, $notes) {
            // Update tenant unit
            $tenantUnit->advance_rent_months = $months;
            $tenantUnit->advance_rent_amount = $amount;
            $tenantUnit->currency = $currency;
            $tenantUnit->advance_rent_used = 0; // Reset usage
            $tenantUnit->advance_rent_collected_date = $transactionDate;
            $tenantUnit->save();

            // Create financial record
            $unitNumber = $tenantUnit->unit->unit_number ?? 'Unit';
            $description = $notes ?? "Advance rent for {$months} month(s) - {$unitNumber}";
            
            $financialRecord = FinancialRecord::create([
                'landlord_id' => $tenantUnit->landlord_id,
                'tenant_unit_id' => $tenantUnit->id,
                'type' => 'rent',
                'category' => 'monthly_rent',
                'amount' => $amount,
                'currency' => $currency,
                'description' => $description,
                'transaction_date' => $transactionDate,
                'paid_date' => $transactionDate,
                'payment_method' => $paymentMethod ?? 'cash',
                'reference_number' => $referenceNumber,
                'status' => 'completed',
            ]);

            return [
                'tenant_unit' => $tenantUnit->fresh(),
                'financial_record' => $financialRecord,
            ];
        });
    }

    /**
     * Calculate advance rent period for a tenant unit.
     *
     * @return array{start: Carbon, end: Carbon}|null
     */
    public function calculateAdvanceRentPeriod(TenantUnit $tenantUnit): ?array
    {
        return $tenantUnit->getAdvanceRentCoveragePeriod();
    }

    /**
     * Retroactively apply advance rent to existing invoices.
     * 
     * This method finds all eligible invoices for a tenant unit that fall within
     * the advance rent coverage period and applies advance rent to them in
     * chronological order.
     *
     * @param  \App\Models\TenantUnit  $tenantUnit
     * @return array{processed: int, applied: float, invoices: array}
     */
    public function retroactivelyApplyAdvanceRent(TenantUnit $tenantUnit): array
    {
        if (!$tenantUnit->advance_rent_months || $tenantUnit->advance_rent_months <= 0) {
            return [
                'processed' => 0,
                'applied' => 0.0,
                'invoices' => [],
            ];
        }

        $coveragePeriod = $tenantUnit->getAdvanceRentCoveragePeriod();
        if (!$coveragePeriod) {
            return [
                'processed' => 0,
                'applied' => 0.0,
                'invoices' => [],
            ];
        }

        return DB::transaction(function () use ($tenantUnit, $coveragePeriod) {
            // Find all invoices that:
            // 1. Belong to this tenant unit
            // 2. Have invoice_date within the coverage period
            // 3. Are not cancelled
            // 4. Haven't already been fully covered by advance rent (or haven't been covered at all)
            // Order by invoice_date to apply chronologically
            $invoices = \App\Models\RentInvoice::query()
                ->where('tenant_unit_id', $tenantUnit->id)
                ->where('status', '!=', 'cancelled')
                ->whereBetween('invoice_date', [
                    $coveragePeriod['start']->toDateString(),
                    $coveragePeriod['end']->toDateString(),
                ])
                ->orderBy('invoice_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $totalApplied = 0.0;
            $processedCount = 0;
            $processedInvoices = [];

            // Reload tenant unit to get fresh advance_rent_used value
            $tenantUnit->refresh();

            foreach ($invoices as $invoice) {
                // Check if there's remaining advance rent
                $remainingAdvance = (float) $tenantUnit->advance_rent_remaining;
                if ($remainingAdvance <= 0) {
                    break; // No more advance rent to apply
                }

                // Calculate invoice amount (rent + late fee)
                $invoiceAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
                
                // Check if invoice already has some advance rent applied
                $alreadyApplied = (float) ($invoice->advance_rent_applied ?? 0);
                $amountStillNeeded = max(0, $invoiceAmount - $alreadyApplied);

                if ($amountStillNeeded <= 0) {
                    continue; // Invoice is already fully covered
                }

                // Calculate how much to apply (can't exceed remaining advance rent)
                $amountToApply = min($amountStillNeeded, $remainingAdvance);
                
                // Update invoice
                $newTotalApplied = $alreadyApplied + $amountToApply;
                $invoice->advance_rent_applied = $newTotalApplied;
                $invoice->is_advance_covered = $newTotalApplied >= $invoiceAmount;

                // If fully covered, update status and payment info
                if ($invoice->is_advance_covered && $invoice->status !== 'paid') {
                    $invoice->status = 'paid';
                    $invoice->paid_date = $invoice->invoice_date;
                    $invoice->payment_method = 'advance_rent';
                }

                $invoice->save();

                // Update tenant unit tracking
                $tenantUnit->advance_rent_used = ((float) ($tenantUnit->advance_rent_used ?? 0)) + $amountToApply;
                $tenantUnit->save();

                $totalApplied += $amountToApply;
                $processedCount++;

                $processedInvoices[] = [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'invoice_date' => $invoice->invoice_date->toDateString(),
                    'amount_applied' => $amountToApply,
                    'total_applied' => $newTotalApplied,
                    'fully_covered' => $invoice->is_advance_covered,
                ];

                // Reload tenant unit for next iteration
                $tenantUnit->refresh();
            }

            return [
                'processed' => $processedCount,
                'applied' => $totalApplied,
                'invoices' => $processedInvoices,
            ];
        });
    }
}


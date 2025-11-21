<?php

namespace App\Services;

use App\Models\Landlord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Services\AdvanceRentService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceService
{
    public function __construct(
        private readonly AdvanceRentService $advanceRentService,
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Generate rent invoices for all active tenant units of a landlord.
     *
     * @param  int  $landlordId
     * @param  Carbon|null  $invoiceDate  Optional invoice date (defaults to first day of current month)
     * @return array{success: bool, created: int, skipped: int, failed: int, invoices: array, errors: array}
     */
    public function generateInvoicesForLandlord(int $landlordId, ?Carbon $invoiceDate = null): array
    {
        $invoiceDate = $invoiceDate ?? Carbon::now()->startOfMonth();
        $dueDate = $invoiceDate->copy()->addDays(
            (int) $this->settingsService->getSetting($landlordId, 'payment_terms.default_due_days', 30)
        );

        // Get all active tenant units for this landlord
        $tenantUnits = TenantUnit::query()
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->with(['tenant:id,full_name', 'unit:id,unit_number,property_id'])
            ->get();

        if ($tenantUnits->isEmpty()) {
            return [
                'success' => true,
                'created' => 0,
                'skipped' => 0,
                'failed' => 0,
                'invoices' => [],
                'errors' => [],
                'message' => 'No active tenant units found.',
            ];
        }

        $created = [];
        $skipped = [];
        $failed = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($tenantUnits as $tenantUnit) {
                try {
                    // Check if invoice already exists for this date and tenant unit
                    $existing = RentInvoice::query()
                        ->where('landlord_id', $landlordId)
                        ->where('tenant_unit_id', $tenantUnit->id)
                        ->where('invoice_date', $invoiceDate->toDateString())
                        ->first();

                    if ($existing) {
                        $skipped[] = [
                            'tenant_unit_id' => $tenantUnit->id,
                            'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                            'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                            'reason' => 'Invoice already exists for this date',
                        ];
                        continue;
                    }

                    // Validate monthly rent
                    $rentAmount = (float) ($tenantUnit->monthly_rent ?? 0);

                    if ($rentAmount <= 0) {
                        $failed[] = [
                            'tenant_unit_id' => $tenantUnit->id,
                            'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                            'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                            'reason' => 'Monthly rent is not set or is zero',
                        ];
                        $errors[] = "Unit {$tenantUnit->unit?->unit_number}: Monthly rent is not set or is zero";
                        continue;
                    }

                    // Create invoice data
                    $invoiceData = [
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlordId,
                        'invoice_date' => $invoiceDate->toDateString(),
                        'due_date' => $dueDate->toDateString(),
                        'rent_amount' => $rentAmount,
                        'late_fee' => 0,
                        'status' => 'generated',
                        'advance_rent_applied' => 0.00,
                        'is_advance_covered' => false,
                    ];

                    $invoice = RentInvoice::create($invoiceData);
                    $invoice->load('tenantUnit');

                    // Apply advance rent if applicable
                    $this->advanceRentService->applyAdvanceRentToInvoice($invoice, $tenantUnit);

                    $invoice->load('tenantUnit.tenant:id,full_name');

                    $created[] = [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'tenant_unit_id' => $tenantUnit->id,
                        'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                        'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                        'invoice_date' => $invoice->invoice_date->toDateString(),
                        'due_date' => $invoice->due_date->toDateString(),
                        'rent_amount' => $rentAmount,
                        'status' => $invoice->status,
                    ];
                } catch (\Exception $e) {
                    Log::error("Failed to generate invoice for tenant unit {$tenantUnit->id}: " . $e->getMessage());
                    $failed[] = [
                        'tenant_unit_id' => $tenantUnit->id,
                        'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                        'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                        'reason' => $e->getMessage(),
                    ];
                    $errors[] = "Unit {$tenantUnit->unit?->unit_number}: {$e->getMessage()}";
                }
            }

            DB::commit();

            $message = sprintf(
                'Auto-invoice generation completed. Created: %d, Skipped: %d, Failed: %d',
                count($created),
                count($skipped),
                count($failed)
            );

            return [
                'success' => true,
                'created' => count($created),
                'skipped' => count($skipped),
                'failed' => count($failed),
                'invoices' => $created,
                'skipped_details' => $skipped,
                'failed_details' => $failed,
                'errors' => $errors,
                'message' => $message,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Auto-invoice generation failed for landlord {$landlordId}: " . $e->getMessage());

            return [
                'success' => false,
                'created' => count($created),
                'skipped' => count($skipped),
                'failed' => count($failed) + ($tenantUnits->count() - count($created) - count($skipped) - count($failed)),
                'invoices' => $created,
                'skipped_details' => $skipped,
                'failed_details' => $failed,
                'errors' => array_merge($errors, [$e->getMessage()]),
                'message' => 'Auto-invoice generation failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Generate rent invoices for all landlords that have auto-invoice enabled.
     *
     * @param  Carbon|null  $invoiceDate  Optional invoice date (defaults to first day of current month)
     * @return array{total_landlords: int, processed: int, success: int, failed: int, results: array}
     */
    public function generateInvoicesForAllEnabled(?Carbon $invoiceDate = null): array
    {
        // Use today's date to check which day of month we're on
        $today = Carbon::now();
        $dayOfMonth = $today->day;
        
        // Invoice date should be first day of current month
        $invoiceDate = $invoiceDate ?? $today->copy()->startOfMonth();

        // Get all landlords with settings
        $landlords = Landlord::with('settings')->get();

        // Filter landlords based on auto-invoice settings
        $enabledLandlords = $landlords->filter(function ($landlord) use ($dayOfMonth) {
            $settings = $this->settingsService->getSettings($landlord->id);
            $autoInvoice = $settings['auto_invoice'] ?? [];

            return ($autoInvoice['enabled'] ?? false) === true
                && ($autoInvoice['day_of_month'] ?? 1) == $dayOfMonth;
        });

        if ($enabledLandlords->isEmpty()) {
            return [
                'total_landlords' => 0,
                'processed' => 0,
                'success' => 0,
                'failed' => 0,
                'results' => [],
                'message' => 'No landlords with auto-invoice enabled for this date.',
            ];
        }

        $processed = 0;
        $success = 0;
        $failed = 0;
        $results = [];

        foreach ($enabledLandlords as $landlord) {
            try {
                $result = $this->generateInvoicesForLandlord($landlord->id, $invoiceDate);
                $processed++;

                if ($result['success']) {
                    $success++;
                } else {
                    $failed++;
                }

                // Update last run status in settings
                $this->updateLastRunStatus($landlord->id, $result);

                $results[] = [
                    'landlord_id' => $landlord->id,
                    'landlord_name' => $landlord->name ?? "Landlord #{$landlord->id}",
                    'result' => $result,
                ];
            } catch (\Exception $e) {
                $processed++;
                $failed++;
                Log::error("Failed to process auto-invoice for landlord {$landlord->id}: " . $e->getMessage());

                $results[] = [
                    'landlord_id' => $landlord->id,
                    'landlord_name' => $landlord->name ?? "Landlord #{$landlord->id}",
                    'result' => [
                        'success' => false,
                        'message' => $e->getMessage(),
                        'created' => 0,
                        'skipped' => 0,
                        'failed' => 0,
                        'errors' => [$e->getMessage()],
                    ],
                ];

                // Update last run status
                $this->updateLastRunStatus($landlord->id, [
                    'success' => false,
                    'message' => $e->getMessage(),
                    'created' => 0,
                    'skipped' => 0,
                    'failed' => 0,
                    'errors' => [$e->getMessage()],
                ]);
            }
        }

        return [
            'total_landlords' => $enabledLandlords->count(),
            'processed' => $processed,
            'success' => $success,
            'failed' => $failed,
            'results' => $results,
            'message' => sprintf(
                'Processed %d landlord(s). Success: %d, Failed: %d',
                $processed,
                $success,
                $failed
            ),
        ];
    }

    /**
     * Update last run status for auto-invoice settings.
     *
     * @param  int  $landlordId
     * @param  array  $result
     * @return void
     */
    private function updateLastRunStatus(int $landlordId, array $result): void
    {
        try {
            $this->settingsService->setSetting($landlordId, 'auto_invoice.last_run_at', now()->toIso8601String());
            $this->settingsService->setSetting($landlordId, 'auto_invoice.last_run_status', $result['success'] ? 'success' : 'failed');
            $this->settingsService->setSetting($landlordId, 'auto_invoice.last_run_message', $result['message'] ?? null);
        } catch (\Exception $e) {
            Log::error("Failed to update last run status for landlord {$landlordId}: " . $e->getMessage());
        }
    }
}


<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\MaintenanceRequest;
use App\Models\SecurityDepositRefund;
use App\Models\TenantUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleOutgoingSeeder extends Seeder
{
    public function run(): void
    {
        $landlord = Landlord::query()->first();
        if (! $landlord) {
            $this->command?->warn('No landlord found; skipping SampleOutgoingSeeder.');
            return;
        }

        $tenantUnits = TenantUnit::query()
            ->where('landlord_id', $landlord->id)
            ->with('unit.assets')
            ->get();

        if ($tenantUnits->isEmpty()) {
            $this->command?->warn('No tenant units found; skipping SampleOutgoingSeeder.');
            return;
        }

        foreach ($tenantUnits->take(5) as $tenantUnit) {
            DB::transaction(function () use ($tenantUnit, $landlord): void {
                // Create one maintenance request (if not present) and a matching expense financial record
                $assetId = $tenantUnit->unit?->assets()->inRandomOrder()->value('id');
                if (! $assetId) {
                    $assetId = Asset::query()->first()?->id;
                }

                $mr = MaintenanceRequest::query()->firstOrCreate(
                    [
                        'landlord_id' => $landlord->id,
                        'unit_id' => $tenantUnit->unit_id,
                        'description' => 'AC servicing - filter change and cleaning',
                    ],
                    [
                        'billed_to_tenant' => false,
                        'is_billable' => false,
                        'tenant_share' => 0,
                        'asset_id' => $assetId,
                        'serviced_by' => 'CoolAir Services',
                        'type' => 'service',
                        'maintenance_date' => now()->subDays(18),
                        'cost' => 1500,
                    ],
                );

                $existingExpense = FinancialRecord::query()->where([
                    'tenant_unit_id' => $tenantUnit->id,
                    'landlord_id' => $landlord->id,
                    'type' => 'expense',
                    'category' => 'maintenance',
                    'description' => 'Maintenance - AC servicing',
                ])->first();

                if (! $existingExpense) {
                    FinancialRecord::query()->create([
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'type' => 'expense',
                        'category' => 'maintenance',
                        'amount' => 1500,
                        'description' => 'Maintenance - AC servicing',
                        'due_date' => now()->subDays(17),
                        'paid_date' => now()->subDays(16),
                        'transaction_date' => now()->subDays(17),
                        'invoice_number' => null,
                        'payment_method' => 'bank_transfer',
                        'reference_number' => 'MR-' . $mr->id,
                        'status' => 'completed',
                    ]);
                }

                // Create a security deposit refund for one unit
                $existingRefund = SecurityDepositRefund::query()->where([
                    'tenant_unit_id' => $tenantUnit->id,
                    'landlord_id' => $landlord->id,
                ])->first();

                if (! $existingRefund) {
                    SecurityDepositRefund::query()->create([
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'original_deposit' => $tenantUnit->monthly_rent ?? 10000,
                        'deductions' => 0,
                        'refund_amount' => 5000,
                        'refund_date' => now()->subDays(10),
                        'payment_method' => 'bank_transfer',
                        'transaction_reference' => 'REF-' . $tenantUnit->id . '-' . now()->format('Ymd'),
                        'status' => 'processed',
                        'receipt_generated' => true,
                        'receipt_number' => 'SDR-' . $tenantUnit->id,
                    ]);
                }
            });
        }
    }
}



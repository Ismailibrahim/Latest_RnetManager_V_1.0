<?php

namespace Database\Seeders;

use App\Models\Landlord;
use App\Models\MaintenanceInvoice;
use App\Models\MaintenanceRequest;
use App\Models\TenantUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleMaintenanceInvoicesSeeder extends Seeder
{
    public function run(): void
    {
        $landlord = Landlord::query()->first();
        if (! $landlord) {
            $this->command?->warn('No landlord found; skipping SampleMaintenanceInvoicesSeeder.');
            return;
        }

        $requests = MaintenanceRequest::query()
            ->where('landlord_id', $landlord->id)
            ->orderByDesc('id')
            ->take(5)
            ->get();

        if ($requests->isEmpty()) {
            $this->command?->warn('No maintenance requests found; skipping SampleMaintenanceInvoicesSeeder.');
            return;
        }

        foreach ($requests as $request) {
            DB::transaction(function () use ($request, $landlord): void {
                $tenantUnitId = TenantUnit::query()
                    ->where('unit_id', $request->unit_id)
                    ->where('landlord_id', $landlord->id)
                    ->value('id');

                $labor = 1000;
                $parts = 500;
                $tax = 105;
                $misc = 50;
                $discount = 0;
                $total = $labor + $parts + $tax + $misc - $discount;

                MaintenanceInvoice::query()->firstOrCreate(
                    [
                        'landlord_id' => $landlord->id,
                        'maintenance_request_id' => $request->id,
                    ],
                    [
                        'tenant_unit_id' => $tenantUnitId,
                        'invoice_date' => now()->subDays(15),
                        'due_date' => now()->subDays(8),
                        'status' => 'paid',
                        'labor_cost' => $labor,
                        'parts_cost' => $parts,
                        'tax_amount' => $tax,
                        'misc_amount' => $misc,
                        'discount_amount' => $discount,
                        'grand_total' => $total,
                        'line_items' => [
                            ['description' => 'AC filter replacement', 'amount' => $parts],
                            ['description' => 'Servicing labor', 'amount' => $labor],
                        ],
                        'paid_date' => now()->subDays(9),
                        'payment_method' => 'bank_transfer',
                        'reference_number' => 'MINV-' . $request->id,
                        'notes' => 'Demo maintenance invoice',
                    ]
                );
            });
        }
    }
}



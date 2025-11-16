<?php

namespace Database\Seeders;

use App\Models\Landlord;
use App\Models\MaintenanceInvoice;
use App\Models\MaintenanceRequest;
use App\Models\TenantUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleMaintenanceInvoicesStatesSeeder extends Seeder
{
    public function run(): void
    {
        $landlord = Landlord::query()->first();
        if (! $landlord) {
            $this->command?->warn('No landlord found; skipping SampleMaintenanceInvoicesStatesSeeder.');
            return;
        }

        $requests = MaintenanceRequest::query()
            ->where('landlord_id', $landlord->id)
            ->orderBy('id')
            ->take(2)
            ->get();

        if ($requests->isEmpty()) {
            $this->command?->warn('No maintenance requests found; skipping SampleMaintenanceInvoicesStatesSeeder.');
            return;
        }

        // Create one "sent" (unpaid, due in future) and one "overdue" (unpaid, past due)
        foreach ($requests as $index => $request) {
            DB::transaction(function () use ($request, $landlord, $index): void {
                $tenantUnitId = TenantUnit::query()
                    ->where('unit_id', $request->unit_id)
                    ->where('landlord_id', $landlord->id)
                    ->value('id');

                $status = $index === 0 ? 'sent' : 'overdue';
                $invoiceDate = $index === 0 ? now()->addDays(3) : now()->subDays(20);
                $dueDate = $index === 0 ? now()->addDays(10) : now()->subDays(10);

                MaintenanceInvoice::query()->firstOrCreate(
                    [
                        'landlord_id' => $landlord->id,
                        'maintenance_request_id' => $request->id,
                        'status' => $status,
                    ],
                    [
                        'tenant_unit_id' => $tenantUnitId,
                        'invoice_date' => $invoiceDate,
                        'due_date' => $dueDate,
                        'labor_cost' => 800,
                        'parts_cost' => 300,
                        'tax_amount' => 92,
                        'misc_amount' => 25,
                        'discount_amount' => 0,
                        'grand_total' => 1217,
                        'line_items' => [
                            ['description' => 'Diagnostics', 'amount' => 300],
                            ['description' => 'Labor', 'amount' => 800],
                        ],
                        'paid_date' => null,
                        'payment_method' => null,
                        'reference_number' => null,
                        'notes' => 'Demo unpaid maintenance invoice',
                    ]
                );
            });
        }
    }
}



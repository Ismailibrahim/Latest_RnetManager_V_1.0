<?php

namespace Database\Seeders;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleFinancialsSeeder extends Seeder
{
    public function run(): void
    {
        $landlord = Landlord::query()->first();
        if (! $landlord) {
            $this->command?->warn('No landlord found; skipping SampleFinancialsSeeder.');
            return;
        }

        $tenantUnits = TenantUnit::query()
            ->where('landlord_id', $landlord->id)
            ->get();

        if ($tenantUnits->isEmpty()) {
            $this->command?->warn('No tenant units found; skipping SampleFinancialsSeeder.');
            return;
        }

        foreach ($tenantUnits as $tenantUnit) {
            DB::transaction(function () use ($tenantUnit, $landlord): void {
                // Generate last 3 months of rent invoices per tenant unit
                for ($monthsAgo = 0; $monthsAgo < 3; $monthsAgo++) {
                    $invoiceDate = now()->startOfMonth()->subMonths($monthsAgo);
                    $dueDate = $invoiceDate->copy()->addDays(7);

                    $existingInvoice = RentInvoice::query()->where([
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'invoice_number' => sprintf('INV-%s-%s', $tenantUnit->id, $invoiceDate->format('Ym')),
                    ])->first();

                    if (! $existingInvoice) {
                        $status = $monthsAgo === 0 ? 'generated' : 'paid';
                        $paidDate = $status === 'paid' ? $invoiceDate->copy()->addDays(rand(1, 10)) : null;

                        $invoice = RentInvoice::query()->create([
                            'tenant_unit_id' => $tenantUnit->id,
                            'landlord_id' => $landlord->id,
                            'invoice_number' => sprintf('INV-%s-%s', $tenantUnit->id, $invoiceDate->format('Ym')),
                            'invoice_date' => $invoiceDate,
                            'due_date' => $dueDate,
                            'rent_amount' => $tenantUnit->monthly_rent ?? 10000,
                            'late_fee' => 0,
                            'status' => $status,
                            'paid_date' => $paidDate,
                            'payment_method' => $paidDate ? 'bank_transfer' : null,
                        ]);
                    } else {
                        $invoice = $existingInvoice;
                    }

                    // Ensure a corresponding financial record exists for unified view
                    $existingRecord = FinancialRecord::query()->where([
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'invoice_number' => $invoice->invoice_number,
                        'type' => 'rent',
                        'category' => 'monthly_rent',
                    ])->first();

                    if (! $existingRecord) {
                        FinancialRecord::query()->create([
                            'tenant_unit_id' => $tenantUnit->id,
                            'landlord_id' => $landlord->id,
                            'type' => 'rent',
                            'category' => 'monthly_rent',
                            'amount' => $tenantUnit->monthly_rent ?? 10000,
                            'description' => 'Monthly rent',
                            'due_date' => $invoice->due_date,
                            'paid_date' => $invoice->paid_date,
                            'transaction_date' => $invoice->invoice_date,
                            'invoice_number' => $invoice->invoice_number,
                            'payment_method' => $invoice->payment_method ?? 'bank_transfer',
                            'reference_number' => null,
                            'status' => $invoice->status === 'paid' ? 'completed' : 'pending',
                        ]);
                    }
                }
            });
        }
    }
}



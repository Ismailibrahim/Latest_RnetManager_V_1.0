<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\MaintenanceInvoice;
use App\Models\MaintenanceRequest;
use App\Models\PaymentMethod;
use App\Models\Property;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use App\Models\UnitType;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Faker\Generator;

class ComprehensiveReportDataSeeder extends Seeder
{
    public function run(): void
    {
        /** @var Generator $faker */
        $faker = app(Generator::class);

        $landlord = Landlord::query()->first();
        if (!$landlord) {
            $this->command?->warn('No landlord found; skipping ComprehensiveReportDataSeeder.');
            return;
        }

        $this->command?->info('Generating comprehensive report data...');

        // Get existing data
        $properties = Property::query()->where('landlord_id', $landlord->id)->get();
        $units = Unit::query()->where('landlord_id', $landlord->id)->get();
        $tenantUnits = TenantUnit::query()->where('landlord_id', $landlord->id)->get();
        // Payment methods are global (no landlord_id), get all active ones
        $paymentMethods = PaymentMethod::query()->where('is_active', true)->get();
        $assetTypes = AssetType::query()->get();

        if ($tenantUnits->isEmpty()) {
            $this->command?->warn('No tenant units found; skipping ComprehensiveReportDataSeeder.');
            return;
        }

        // Create vendors if needed
        $vendors = $this->createVendors($landlord, $faker);

        // Generate 12+ months of financial data
        $this->generateFinancialData($landlord, $tenantUnits, $paymentMethods, $faker);

        // Generate maintenance data
        $this->generateMaintenanceData($landlord, $units, $tenantUnits, $vendors, $assetTypes, $faker);

        // Generate security deposit refunds
        $this->generateSecurityDepositRefunds($landlord, $tenantUnits, $paymentMethods, $faker);

        // Generate unit occupancy history
        $this->generateUnitOccupancyHistory($landlord, $tenantUnits, $faker);

        $this->command?->info('Comprehensive report data generation completed!');
    }

    protected function createVendors(Landlord $landlord, Generator $faker): array
    {
        $categories = ['plumbing', 'electrical', 'hvac', 'cleaning', 'landscaping', 'general'];
        $vendors = [];

        foreach ($categories as $category) {
            $vendor = Vendor::query()->firstOrCreate(
                [
                    'landlord_id' => $landlord->id,
                    'name' => ucfirst($category) . ' Services ' . $faker->companySuffix(),
                ],
                [
                    'service_category' => $category,
                    'phone' => $faker->phoneNumber(),
                    'email' => $faker->companyEmail(),
                    'is_preferred' => $faker->boolean(30),
                    'notes' => $faker->optional()->sentence(),
                ]
            );
            $vendors[] = $vendor;
        }

        return $vendors;
    }

    protected function generateFinancialData(
        Landlord $landlord,
        $tenantUnits,
        $paymentMethods,
        Generator $faker
    ): void {
        $this->command?->info('Generating financial data (12+ months)...');

        $statuses = ['completed', 'pending', 'overdue'];
        // Financial records type enum only supports: 'rent', 'expense', 'fee', 'refund'
        // Valid categories: 'monthly_rent', 'late_fee', 'processing_fee', 'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other'
        $types = ['rent', 'expense', 'fee'];
        $categories = [
            'rent' => ['monthly_rent', 'late_fee'],
            'expense' => ['maintenance', 'repair', 'utility', 'insurance', 'tax', 'other'],
            'fee' => ['late_fee', 'processing_fee', 'other'],
        ];

        foreach ($tenantUnits as $tenantUnit) {
            // Generate 12 months of rent invoices
            for ($monthsAgo = 0; $monthsAgo < 12; $monthsAgo++) {
                $invoiceDate = now()->startOfMonth()->subMonths($monthsAgo);
                $dueDate = $invoiceDate->copy()->addDays(7);

                // Determine status based on how old the invoice is
                if ($monthsAgo === 0) {
                    $status = $faker->randomElement(['generated', 'paid']);
                } elseif ($monthsAgo <= 1) {
                    $status = $faker->randomElement(['paid', 'generated', 'overdue']);
                } else {
                    $status = 'paid'; // Older invoices are mostly paid
                }

                $paidDate = null;
                $paymentMethod = null;
                if ($status === 'paid') {
                    $paidDate = $invoiceDate->copy()->addDays(rand(1, 15));
                    $paymentMethod = $paymentMethods->isNotEmpty() 
                        ? $paymentMethods->random()->name 
                        : 'bank_transfer';
                }

                $rentAmount = $tenantUnit->monthly_rent ?? 10000;
                $lateFee = ($status === 'overdue' && $monthsAgo > 0) ? $faker->randomFloat(2, 500, 2000) : 0;

                // Create rent invoice
                $invoice = RentInvoice::query()->firstOrCreate(
                    [
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'invoice_number' => sprintf('INV-%s-%s', $tenantUnit->id, $invoiceDate->format('Ym')),
                    ],
                    [
                        'invoice_date' => $invoiceDate,
                        'due_date' => $dueDate,
                        'rent_amount' => $rentAmount,
                        'late_fee' => $lateFee,
                        'status' => $status,
                        'paid_date' => $paidDate,
                        'payment_method' => $paymentMethod,
                    ]
                );

                // Create corresponding financial record
                FinancialRecord::query()->firstOrCreate(
                    [
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'invoice_number' => $invoice->invoice_number,
                        'type' => 'rent',
                        'category' => 'monthly_rent',
                    ],
                    [
                        'amount' => $rentAmount + $lateFee,
                        'description' => 'Monthly rent' . ($lateFee > 0 ? ' + late fee' : ''),
                        'due_date' => $dueDate,
                        'paid_date' => $paidDate,
                        'transaction_date' => $invoiceDate,
                        'payment_method' => $paymentMethod,
                        'status' => $status === 'paid' ? 'completed' : ($status === 'overdue' ? 'overdue' : 'pending'),
                    ]
                );
            }

            // Generate additional financial records (expenses and fees)
            for ($i = 0; $i < 5; $i++) {
                $type = $faker->randomElement(['expense', 'fee']);
                $category = $faker->randomElement($categories[$type]);
                $monthsAgo = $faker->numberBetween(0, 6);
                $transactionDate = now()->subMonths($monthsAgo)->subDays(rand(0, 30));

                FinancialRecord::query()->firstOrCreate(
                    [
                        'tenant_unit_id' => $tenantUnit->id,
                        'landlord_id' => $landlord->id,
                        'type' => $type,
                        'category' => $category,
                        'transaction_date' => $transactionDate,
                    ],
                    [
                        'amount' => $faker->randomFloat(2, 500, 5000),
                        'description' => ucfirst(str_replace('_', ' ', $category)),
                        'due_date' => $transactionDate->copy()->addDays(7),
                        'paid_date' => $type === 'fee' ? $transactionDate->copy()->addDays(rand(1, 5)) : null,
                        'transaction_date' => $transactionDate,
                        'payment_method' => $paymentMethods->isNotEmpty() 
                            ? $paymentMethods->random()->name 
                            : 'bank_transfer',
                        'status' => $faker->randomElement(['completed', 'pending']),
                    ]
                );
            }
        }
    }

    protected function generateMaintenanceData(
        Landlord $landlord,
        $units,
        $tenantUnits,
        $vendors,
        $assetTypes,
        Generator $faker
    ): void {
        $this->command?->info('Generating maintenance data...');

        $types = ['repair', 'replacement', 'service'];
        $statuses = ['completed', 'in_progress', 'pending'];

        // Generate maintenance requests
        foreach ($units as $unit) {
            // Generate 2-5 maintenance requests per unit
            $requestCount = $faker->numberBetween(2, 5);

            for ($i = 0; $i < $requestCount; $i++) {
                $monthsAgo = $faker->numberBetween(0, 8);
                $maintenanceDate = now()->subMonths($monthsAgo)->subDays(rand(0, 30));

                $asset = $unit->assets()->inRandomOrder()->first();
                $billedToTenant = $faker->boolean(40);
                $tenantShare = $billedToTenant ? $faker->randomFloat(2, 500, 2000) : 0;

                $request = MaintenanceRequest::query()->firstOrCreate(
                    [
                        'landlord_id' => $landlord->id,
                        'unit_id' => $unit->id,
                        'maintenance_date' => $maintenanceDate,
                        'description' => $faker->sentence(),
                    ],
                    [
                        'asset_id' => $asset?->id,
                        'type' => $faker->randomElement($types),
                        'cost' => $faker->randomFloat(2, 500, 5000),
                        'location' => $faker->optional()->randomElement(['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Balcony']),
                        'serviced_by' => !empty($vendors) ? collect($vendors)->random()->name : $faker->name(),
                        'invoice_number' => $faker->optional()->bothify('EXT-####'),
                        'billed_to_tenant' => $billedToTenant,
                        'tenant_share' => $tenantShare,
                        // 'status' => $faker->randomElement($statuses), // maintenance_requests table doesn't have status column
                        // 'notes' => $faker->optional()->paragraph(), // maintenance_requests table doesn't have notes column
                    ]
                );

                // Create maintenance invoice for some requests (60% chance)
                if ($faker->boolean(60)) {
                    $tenantUnit = $tenantUnits->where('unit_id', $unit->id)->first();
                    $invoiceStatus = $faker->randomElement(['paid', 'sent', 'overdue']);

                    $laborCost = $faker->randomFloat(2, 500, 2000);
                    $partsCost = $faker->randomFloat(2, 300, 1500);
                    $taxAmount = ($laborCost + $partsCost) * 0.10; // 10% tax
                    $miscAmount = $faker->randomFloat(2, 0, 200);
                    $discountAmount = $faker->boolean(20) ? $faker->randomFloat(2, 50, 300) : 0;
                    $grandTotal = $laborCost + $partsCost + $taxAmount + $miscAmount - $discountAmount;

                    $invoiceDate = $maintenanceDate->copy()->addDays(rand(1, 5));
                    $dueDate = $invoiceDate->copy()->addDays(7);
                    $paidDate = $invoiceStatus === 'paid' ? $dueDate->copy()->addDays(rand(1, 10)) : null;

                    MaintenanceInvoice::query()->firstOrCreate(
                        [
                            'landlord_id' => $landlord->id,
                            'maintenance_request_id' => $request->id,
                        ],
                        [
                            'tenant_unit_id' => $tenantUnit?->id,
                            'invoice_date' => $invoiceDate,
                            'due_date' => $dueDate,
                            'status' => $invoiceStatus,
                            'labor_cost' => $laborCost,
                            'parts_cost' => $partsCost,
                            'tax_amount' => $taxAmount,
                            'misc_amount' => $miscAmount,
                            'discount_amount' => $discountAmount,
                            'grand_total' => $grandTotal,
                            'line_items' => [
                                ['description' => 'Labor charges', 'amount' => $laborCost],
                                ['description' => 'Parts and materials', 'amount' => $partsCost],
                            ],
                            'paid_date' => $paidDate,
                            'payment_method' => $paidDate ? ($faker->randomElement(['bank_transfer', 'cash', 'check'])) : null,
                            'reference_number' => $paidDate ? $faker->bothify('REF-####') : null,
                            'notes' => $faker->optional()->sentence(),
                        ]
                    );
                }
            }
        }
    }

    protected function generateSecurityDepositRefunds(
        Landlord $landlord,
        $tenantUnits,
        $paymentMethods,
        Generator $faker
    ): void {
        $this->command?->info('Generating security deposit refunds...');

        // Generate refunds for some ended leases
        $endedLeases = $tenantUnits->filter(function ($tu) {
            return $tu->status === 'ended' || ($tu->lease_end && $tu->lease_end->isPast());
        });

        if ($endedLeases->isEmpty()) {
            // Create some ended leases for refund testing
            $sampleTenantUnits = $tenantUnits->take(3);
            foreach ($sampleTenantUnits as $tu) {
                $tu->update([
                    'status' => 'ended',
                    'lease_end' => now()->subMonths(rand(1, 6)),
                ]);
            }
            $endedLeases = $sampleTenantUnits;
        }

        foreach ($endedLeases as $tenantUnit) {
            $refundDate = $tenantUnit->lease_end?->copy()->addDays(rand(7, 30)) ?? now()->subMonths(rand(1, 6));
            $originalDeposit = $tenantUnit->unit->security_deposit ?? 10000;
            $deductions = $faker->boolean(50) ? $faker->randomFloat(2, 500, 2000) : 0;
            $refundAmount = $originalDeposit - $deductions;
            $status = $faker->randomElement(['completed', 'pending', 'voided']);

            SecurityDepositRefund::query()->firstOrCreate(
                [
                    'tenant_unit_id' => $tenantUnit->id,
                    'landlord_id' => $landlord->id,
                ],
                [
                    'refund_date' => $refundDate,
                    'original_deposit' => $originalDeposit,
                    'deductions' => $deductions,
                    'refund_amount' => $refundAmount,
                    'deduction_reasons' => $deductions > 0 ? [
                        ['reason' => 'Damage repair', 'amount' => $deductions],
                    ] : null,
                    'status' => $status,
                    'payment_method' => $status === 'completed' 
                        ? ($paymentMethods->isNotEmpty() ? $paymentMethods->random()->name : 'bank_transfer')
                        : null,
                    'transaction_reference' => $status === 'completed' ? $faker->bothify('REF-####') : null,
                    'receipt_generated' => $status === 'completed',
                ]
            );
        }
    }

    protected function generateUnitOccupancyHistory(
        Landlord $landlord,
        $tenantUnits,
        Generator $faker
    ): void {
        $this->command?->info('Generating unit occupancy history...');

        foreach ($tenantUnits as $tenantUnit) {
            // Create move-in record
            UnitOccupancyHistory::query()->firstOrCreate(
                [
                    'landlord_id' => $landlord->id,
                    'unit_id' => $tenantUnit->unit_id,
                    'tenant_id' => $tenantUnit->tenant_id,
                    'tenant_unit_id' => $tenantUnit->id,
                    'action' => 'move_in',
                    'action_date' => $tenantUnit->lease_start ?? now()->subYear(),
                ],
                [
                    'monthly_rent' => $tenantUnit->monthly_rent,
                    'security_deposit' => $tenantUnit->unit->security_deposit ?? 0,
                    'notes' => $faker->optional()->sentence(),
                ]
            );

            // Create move-out record if lease ended
            if ($tenantUnit->status === 'ended' && $tenantUnit->lease_end) {
                UnitOccupancyHistory::query()->firstOrCreate(
                    [
                        'landlord_id' => $landlord->id,
                        'unit_id' => $tenantUnit->unit_id,
                        'tenant_id' => $tenantUnit->tenant_id,
                        'tenant_unit_id' => $tenantUnit->id,
                        'action' => 'move_out',
                        'action_date' => $tenantUnit->lease_end,
                    ],
                    [
                        'notes' => $faker->optional()->sentence(),
                    ]
                );
            }
        }
    }
}


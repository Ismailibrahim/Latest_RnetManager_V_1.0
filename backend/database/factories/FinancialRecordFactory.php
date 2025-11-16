<?php

namespace Database\Factories;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\TenantUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinancialRecord>
 */
class FinancialRecordFactory extends Factory
{
    protected $model = FinancialRecord::class;

    public function definition(): array
    {
        $type = fake()->randomElement(['rent', 'expense', 'security_deposit', 'refund', 'fee']);

        return [
            'landlord_id' => Landlord::factory(),
            'tenant_unit_id' => TenantUnit::factory(),
            'type' => $type,
            'category' => fake()->randomElement([
                'monthly_rent', 'late_fee', 'processing_fee', 'maintenance', 'repair',
                'utility', 'tax', 'insurance', 'management_fee', 'other',
            ]),
            'amount' => fake()->randomFloat(2, 100, 25000),
            'description' => fake()->sentence(),
            'due_date' => fake()->dateTimeBetween('-1 month', '+1 month'),
            'paid_date' => fake()->dateTimeBetween('-1 month', 'now'),
            'transaction_date' => fake()->dateTimeBetween('-1 month', 'now'),
            'invoice_number' => fake()->optional()->bothify('INV-####'),
            'payment_method' => fake()->randomElement(['cash', 'bank_transfer', 'upi', 'card', 'cheque']),
            'reference_number' => fake()->optional()->bothify('REF-#####'),
            'parent_id' => null,
            'is_installment' => false,
            'installment_number' => null,
            'total_installments' => null,
            'status' => fake()->randomElement(['pending', 'completed', 'cancelled', 'overdue', 'partial']),
        ];
    }
}


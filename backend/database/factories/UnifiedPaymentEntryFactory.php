<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnifiedPaymentEntry>
 */
class UnifiedPaymentEntryFactory extends Factory
{
    protected $model = UnifiedPaymentEntry::class;

    public function definition(): array
    {
        $landlord = Landlord::factory();
        $tenantUnit = TenantUnit::factory()->for($landlord);
        $paymentType = fake()->randomElement([
            'rent',
            'maintenance_expense',
            'security_refund',
            'fee',
            'other_income',
            'other_outgoing',
        ]);

        $flowDirection = in_array($paymentType, ['maintenance_expense', 'security_refund', 'other_outgoing'], true)
            ? 'outgoing'
            : 'income';

        return [
            'landlord_id' => $landlord,
            'tenant_unit_id' => $tenantUnit,
            'payment_type' => $paymentType,
            'flow_direction' => $flowDirection,
            'amount' => fake()->randomFloat(2, 100, 25000),
            'currency' => 'USD',
            'description' => fake()->sentence(),
            'due_date' => fake()->optional()->dateTimeBetween('now', '+1 month'),
            'transaction_date' => fake()->optional()->dateTimeBetween('-1 month', 'now'),
            'status' => fake()->randomElement([
                'draft',
                'pending',
                'scheduled',
                'completed',
                'partial',
                'cancelled',
                'failed',
                'refunded',
            ]),
            'payment_method' => fake()->optional()->randomElement(['cash', 'bank_transfer', 'upi', 'card']),
            'reference_number' => fake()->optional()->bothify('PAY-####'),
            'metadata' => [],
            'created_by' => User::factory()->for($landlord),
            'captured_at' => null,
            'voided_at' => null,
        ];
    }
}



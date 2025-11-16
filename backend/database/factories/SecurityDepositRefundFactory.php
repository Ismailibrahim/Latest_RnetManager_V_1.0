<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\SecurityDepositRefund;
use App\Models\TenantUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecurityDepositRefund>
 */
class SecurityDepositRefundFactory extends Factory
{
    protected $model = SecurityDepositRefund::class;

    public function definition(): array
    {
        $originalDeposit = fake()->randomFloat(2, 8000, 50000);
        $deductions = fake()->randomFloat(2, 0, $originalDeposit / 2);

        $landlord = Landlord::factory();

        return [
            'tenant_unit_id' => TenantUnit::factory()->for($landlord),
            'landlord_id' => $landlord,
            'refund_number' => strtoupper(fake()->bothify('REF-#####')),
            'refund_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'original_deposit' => $originalDeposit,
            'deductions' => $deductions,
            'refund_amount' => $originalDeposit - $deductions,
            'deduction_reasons' => [['reason' => 'Cleaning', 'amount' => $deductions]],
            'status' => fake()->randomElement(['pending', 'processed', 'cancelled']),
            'payment_method' => fake()->optional()->randomElement(['bank_transfer', 'cheque', 'cash', 'upi']),
            'transaction_reference' => fake()->optional()->bothify('TXN-#####'),
            'receipt_generated' => fake()->boolean(),
            'receipt_number' => fake()->optional()->bothify('RCPT-#####'),
        ];
    }
}


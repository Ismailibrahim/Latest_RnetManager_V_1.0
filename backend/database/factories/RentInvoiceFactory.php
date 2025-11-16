<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RentInvoice>
 */
class RentInvoiceFactory extends Factory
{
    protected $model = RentInvoice::class;

    public function definition(): array
    {
        $invoiceDate = fake()->dateTimeBetween('-3 months', 'now');

        return [
            'tenant_unit_id' => TenantUnit::factory(),
            'landlord_id' => Landlord::factory(),
            'invoice_number' => strtoupper(fake()->bothify('INV-#####')),
            'invoice_date' => $invoiceDate,
            'due_date' => (clone $invoiceDate)->modify('+7 days'),
            'rent_amount' => fake()->randomFloat(2, 8000, 25000),
            'late_fee' => fake()->randomFloat(2, 0, 1000),
            'status' => fake()->randomElement(['generated', 'sent', 'paid', 'overdue', 'cancelled']),
            'paid_date' => fake()->optional()->dateTimeBetween($invoiceDate, 'now'),
            'payment_method' => fake()->optional()->randomElement(['cash', 'bank_transfer', 'upi', 'card', 'cheque']),
        ];
    }
}


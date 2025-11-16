<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\SubscriptionInvoice;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<SubscriptionInvoice>
 */
class SubscriptionInvoiceFactory extends Factory
{
    protected $model = SubscriptionInvoice::class;

    public function definition(): array
    {
        $issuedAt = fake()->dateTimeBetween('-6 months', 'now');
        $periodStart = (clone $issuedAt)->modify('first day of this month');
        $periodEnd = (clone $periodStart)->modify('last day of this month');

        $status = fake()->randomElement(['paid', 'pending', 'overdue']);

        return [
            'landlord_id' => Landlord::factory(),
            'invoice_number' => strtoupper(Str::random(3)) . '-' . fake()->unique()->numerify('#####'),
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'issued_at' => $issuedAt,
            'due_at' => (clone $issuedAt)->modify('+7 days'),
            'paid_at' => $status === 'paid'
                ? fake()->dateTimeBetween($issuedAt, '+5 days')
                : null,
            'amount' => fake()->randomFloat(2, 150, 500),
            'currency' => 'USD',
            'status' => $status,
            'download_url' => null,
            'metadata' => [
                'description' => 'Subscription fee',
            ],
        ];
    }
}



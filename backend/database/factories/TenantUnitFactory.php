<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TenantUnit>
 */
class TenantUnitFactory extends Factory
{
    protected $model = TenantUnit::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-2 years', '-1 month');
        $end = (clone $start)->modify('+12 months');

        $landlord = Landlord::factory();

        return [
            'tenant_id' => Tenant::factory()->for($landlord),
            'unit_id' => Unit::factory()
                ->for(Property::factory()->for($landlord))
                ->for($landlord),
            'landlord_id' => $landlord,
            'lease_start' => $start,
            'lease_end' => $end,
            'monthly_rent' => fake()->randomFloat(2, 8000, 25000),
            'security_deposit_paid' => fake()->randomFloat(2, 8000, 50000),
            'advance_rent_months' => fake()->numberBetween(0, 2),
            'advance_rent_amount' => fake()->randomFloat(2, 0, 50000),
            'notice_period_days' => fake()->numberBetween(15, 90),
            'lock_in_period_months' => fake()->numberBetween(0, 12),
            'status' => fake()->randomElement(['active', 'ended', 'cancelled']),
        ];
    }
}


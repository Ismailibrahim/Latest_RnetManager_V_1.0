<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitOccupancyHistory>
 */
class UnitOccupancyHistoryFactory extends Factory
{
    protected $model = UnitOccupancyHistory::class;

    public function definition(): array
    {
        $landlord = Landlord::factory();

        $unit = Unit::factory()->for($landlord);
        $tenant = Tenant::factory()->for($landlord);
        $tenantUnit = TenantUnit::factory()
            ->for($tenant)
            ->for($unit);

        return [
            'unit_id' => $unit,
            'tenant_id' => $tenant,
            'tenant_unit_id' => $tenantUnit,
            'action' => fake()->randomElement(['move_in', 'move_out']),
            'action_date' => fake()->dateTimeBetween('-2 years', 'now'),
            'rent_amount' => fake()->randomFloat(2, 8000, 25000),
            'security_deposit_amount' => fake()->randomFloat(2, 8000, 50000),
            'lease_start_date' => fake()->optional()->date(),
            'lease_end_date' => fake()->optional()->date(),
            'notes' => fake()->sentence(),
        ];
    }
}


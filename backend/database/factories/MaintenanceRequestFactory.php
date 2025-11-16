<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\Landlord;
use App\Models\MaintenanceRequest;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaintenanceRequest>
 */
class MaintenanceRequestFactory extends Factory
{
    protected $model = MaintenanceRequest::class;

    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'landlord_id' => Landlord::factory(),
            'description' => fake()->sentence(12),
            'cost' => fake()->randomFloat(2, 500, 5000),
            'asset_id' => Asset::factory(),
            'location' => fake()->word(),
            'serviced_by' => fake()->company(),
            'invoice_number' => fake()->optional()->bothify('MR-#####'),
            'is_billable' => fake()->boolean(80),
            'billed_to_tenant' => fake()->boolean(40),
            'tenant_share' => fake()->randomFloat(2, 0, 2000),
            'type' => fake()->randomElement(['repair', 'replacement', 'service']),
            'maintenance_date' => fake()->dateTimeBetween('-6 months', 'now'),
        ];
    }
}


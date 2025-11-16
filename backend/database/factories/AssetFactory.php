<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Asset>
 */
class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        $landlord = Landlord::factory();

        $property = Property::factory()->for($landlord);
        $unit = Unit::factory()
            ->for($landlord)
            ->for($property);

        $tenant = Tenant::factory()->for($landlord);

        return [
            'asset_type_id' => AssetType::factory(),
            'unit_id' => $unit,
            'ownership' => fake()->randomElement(['landlord', 'tenant']),
            'tenant_id' => fake()->boolean(40) ? $tenant : null,
            'name' => ucfirst(fake()->word()).' Asset',
            'brand' => fake()->company(),
            'model' => strtoupper(fake()->bothify('MDL-###')),
            'location' => fake()->word(),
            'installation_date' => fake()->optional()->date(),
            'status' => fake()->randomElement(['working', 'maintenance', 'broken']),
        ];
    }
}


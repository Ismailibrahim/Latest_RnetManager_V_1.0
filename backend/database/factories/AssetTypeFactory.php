<?php

namespace Database\Factories;

use App\Models\AssetType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssetType>
 */
class AssetTypeFactory extends Factory
{
    protected $model = AssetType::class;

    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->word()),
            'category' => fake()->randomElement(['appliance', 'furniture', 'electronic', 'fixture', 'other']),
            'is_active' => true,
        ];
    }
}


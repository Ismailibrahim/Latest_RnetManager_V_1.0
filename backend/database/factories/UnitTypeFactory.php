<?php

namespace Database\Factories;

use App\Models\UnitType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitType>
 */
class UnitTypeFactory extends Factory
{
    protected $model = UnitType::class;

    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->word()),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}


<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'landlord_id' => Landlord::factory(),
            'unit_type_id' => UnitType::factory(),
            'unit_number' => strtoupper(fake()->unique()->bothify('A-##')),
            'rent_amount' => fake()->randomFloat(2, 8000, 25000),
            'security_deposit' => fake()->randomFloat(2, 8000, 50000),
            'is_occupied' => fake()->boolean(),
        ];
    }
}


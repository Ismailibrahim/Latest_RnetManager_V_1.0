<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Property;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    protected $model = Property::class;

    public function definition(): array
    {
        return [
            'landlord_id' => Landlord::factory(),
            'name' => fake()->streetName().' Residence',
            'address' => fake()->address(),
            'type' => fake()->randomElement(['residential', 'commercial']),
        ];
    }
}


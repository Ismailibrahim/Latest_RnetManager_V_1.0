<?php

namespace Database\Factories;

use App\Models\Nationality;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Nationality>
 */
class NationalityFactory extends Factory
{
    protected $model = Nationality::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->country(),
        ];
    }
}


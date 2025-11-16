<?php

namespace Database\Factories;

use App\Models\Landlord;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Landlord>
 */
class LandlordFactory extends Factory
{
    protected $model = Landlord::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_name' => fake()->company(),
            'subscription_tier' => fake()->randomElement([
                Landlord::TIER_BASIC,
                Landlord::TIER_PRO,
                Landlord::TIER_ENTERPRISE,
            ]),
        ];
    }
}


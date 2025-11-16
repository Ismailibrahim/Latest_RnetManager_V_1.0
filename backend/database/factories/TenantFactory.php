<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Nationality;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'landlord_id' => Landlord::factory(),
            'full_name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'alternate_phone' => fake()->phoneNumber(),
            'emergency_contact_name' => fake()->name(),
            'emergency_contact_phone' => fake()->phoneNumber(),
            'emergency_contact_relationship' => fake()->randomElement(['Spouse', 'Sibling', 'Parent', null]),
            'nationality_id' => Nationality::factory(),
            'id_proof_type' => fake()->randomElement(['national_id', 'passport']),
            'id_proof_number' => strtoupper(fake()->bothify('ID#######')),
            'status' => 'active',
        ];
    }
}


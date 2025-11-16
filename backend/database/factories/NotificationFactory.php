<?php

namespace Database\Factories;

use App\Models\Landlord;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'landlord_id' => Landlord::factory(),
            'type' => fake()->randomElement(['rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system']),
            'title' => fake()->sentence(),
            'message' => fake()->paragraph(),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'urgent']),
            'action_url' => fake()->optional()->url(),
            'expires_at' => fake()->optional()->dateTimeBetween('now', '+1 month'),
            'sent_via' => fake()->randomElement(['in_app', 'email', 'sms', 'telegram', 'all']),
            'is_read' => fake()->boolean(30),
        ];
    }
}


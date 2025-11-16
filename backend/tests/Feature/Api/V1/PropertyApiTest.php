<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_properties(): void
    {
        $user = $this->actingAsOwner();

        Property::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
        ]);

        $response = $this->getJson('/api/v1/properties');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'landlord_id', 'name', 'address', 'type'],
                ],
            ]);
    }

    public function test_owner_can_create_property(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'name' => 'Maldives Beachfront',
            'address' => '123 Coral Street, Malé',
            'type' => 'residential',
        ];

        $response = $this->postJson('/api/v1/properties', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.name', $payload['name']);

        $this->assertDatabaseHas('properties', [
            'landlord_id' => $user->landlord_id,
            'name' => $payload['name'],
        ]);
    }

    public function test_owner_can_update_property(): void
    {
        $user = $this->actingAsOwner();

        $property = Property::factory()->create([
            'landlord_id' => $user->landlord_id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/v1/properties/{$property->id}", [
            'name' => 'Ocean Breeze Towers',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Ocean Breeze Towers');

        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'name' => 'Ocean Breeze Towers',
        ]);
    }

    public function test_owner_can_delete_property(): void
    {
        $user = $this->actingAsOwner();

        $property = Property::factory()->create([
            'landlord_id' => $user->landlord_id,
        ]);

        $response = $this->deleteJson("/api/v1/properties/{$property->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('properties', [
            'id' => $property->id,
        ]);
    }

    public function test_cannot_access_other_landlord_property(): void
    {
        $this->actingAsOwner();

        $foreignProperty = Property::factory()->create(); // different landlord via factory

        $this->getJson("/api/v1/properties/{$foreignProperty->id}")
            ->assertForbidden();
    }
}

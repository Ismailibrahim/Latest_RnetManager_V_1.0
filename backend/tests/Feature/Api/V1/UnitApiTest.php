<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnitApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setupOwnerContext(): array
    {
        $landlord = Landlord::factory()->create();

        $user = User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => User::ROLE_OWNER,
            'is_active' => true,
        ]);

        $property = Property::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $unitType = UnitType::factory()->create([
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        return compact('user', 'property', 'unitType');
    }

    public function test_owner_can_list_units(): void
    {
        ['user' => $user, 'property' => $property] = $this->setupOwnerContext();

        Unit::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
            'property_id' => $property->id,
        ]);

        $response = $this->getJson('/api/v1/units');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'property_id', 'unit_number', 'rent_amount'],
                ],
            ]);
    }

    public function test_owner_can_create_unit(): void
    {
        ['user' => $user, 'property' => $property, 'unitType' => $unitType] = $this->setupOwnerContext();

        $payload = [
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
            'unit_number' => 'A-101',
            'rent_amount' => 15000,
            'security_deposit' => 20000,
        ];

        $response = $this->postJson('/api/v1/units', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.unit_number', 'A-101');

        $this->assertDatabaseHas('units', [
            'landlord_id' => $user->landlord_id,
            'property_id' => $property->id,
            'unit_number' => 'A-101',
        ]);
    }

    public function test_owner_can_update_unit(): void
    {
        ['property' => $property, 'unitType' => $unitType, 'user' => $user] = $this->setupOwnerContext();

        $unit = Unit::factory()->create([
            'landlord_id' => $user->landlord_id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
            'unit_number' => 'B-202',
        ]);

        $response = $this->putJson("/api/v1/units/{$unit->id}", [
            'unit_number' => 'B-204',
            'rent_amount' => 18500,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.unit_number', 'B-204');

        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'unit_number' => 'B-204',
            'rent_amount' => 18500,
        ]);
    }

    public function test_owner_can_delete_unit(): void
    {
        ['property' => $property, 'unitType' => $unitType, 'user' => $user] = $this->setupOwnerContext();

        $unit = Unit::factory()->create([
            'landlord_id' => $user->landlord_id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $response = $this->deleteJson("/api/v1/units/{$unit->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('units', [
            'id' => $unit->id,
        ]);
    }

    public function test_cannot_view_unit_of_other_landlord(): void
    {
        $this->setupOwnerContext(); // acts as owner of first landlord

        $foreignUnit = Unit::factory()->create(); // uses different landlord via factory

        $this->getJson("/api/v1/units/{$foreignUnit->id}")
            ->assertForbidden();
    }
}

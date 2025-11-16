<?php

namespace Tests\Feature\Api\V1;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\Landlord;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaintenanceRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setupContext(): array
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

        $unitType = UnitType::factory()->create();

        $unit = Unit::factory()->create([
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $assetType = AssetType::factory()->create();

        $asset = Asset::factory()->create([
            'asset_type_id' => $assetType->id,
            'unit_id' => $unit->id,
            'ownership' => 'landlord',
            'tenant_id' => null,
        ]);

        Sanctum::actingAs($user);

        return compact('user', 'unit', 'asset');
    }

    public function test_owner_can_list_maintenance_requests(): void
    {
        ['user' => $user, 'unit' => $unit] = $this->setupContext();

        MaintenanceRequest::factory()->count(2)->for($unit)->create([
            'landlord_id' => $user->landlord_id,
            'asset_id' => null,
        ]);

        $response = $this->getJson('/api/v1/maintenance-requests');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'unit_id', 'description', 'cost'],
                ],
            ]);
    }

    public function test_owner_can_create_maintenance_request(): void
    {
        ['unit' => $unit, 'asset' => $asset] = $this->setupContext();

        $payload = [
            'unit_id' => $unit->id,
            'description' => 'Fix leaking sink',
            'cost' => 2500,
            'asset_id' => $asset->id,
            'is_billable' => true,
            'billed_to_tenant' => false,
            'type' => 'repair',
            'maintenance_date' => '2025-01-15',
        ];

        $response = $this->postJson('/api/v1/maintenance-requests', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.description', 'Fix leaking sink');

        $this->assertDatabaseHas('maintenance_requests', [
            'unit_id' => $unit->id,
            'description' => 'Fix leaking sink',
        ]);
    }

    public function test_owner_can_update_maintenance_request(): void
    {
        ['user' => $user, 'unit' => $unit] = $this->setupContext();

        $maintenanceRequest = MaintenanceRequest::factory()->for($unit)->create([
            'landlord_id' => $user->landlord_id,
            'description' => 'Initial issue',
            'asset_id' => null,
        ]);

        $response = $this->putJson("/api/v1/maintenance-requests/{$maintenanceRequest->id}", [
            'description' => 'Updated issue',
            'cost' => 3200,
            'billed_to_tenant' => true,
            'tenant_share' => 1200,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.description', 'Updated issue');

        $this->assertDatabaseHas('maintenance_requests', [
            'id' => $maintenanceRequest->id,
            'description' => 'Updated issue',
            'tenant_share' => 1200,
        ]);
    }

    public function test_owner_can_delete_maintenance_request(): void
    {
        ['user' => $user, 'unit' => $unit] = $this->setupContext();

        $maintenanceRequest = MaintenanceRequest::factory()->for($unit)->create([
            'landlord_id' => $user->landlord_id,
            'asset_id' => null,
        ]);

        $response = $this->deleteJson("/api/v1/maintenance-requests/{$maintenanceRequest->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('maintenance_requests', [
            'id' => $maintenanceRequest->id,
        ]);
    }

    public function test_cannot_view_foreign_maintenance_request(): void
    {
        $this->setupContext();

        $foreignRequest = MaintenanceRequest::factory()->create();

        $this->getJson("/api/v1/maintenance-requests/{$foreignRequest->id}")
            ->assertForbidden();
    }
}
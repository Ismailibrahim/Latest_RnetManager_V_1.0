<?php

namespace Tests\Feature\Api\V1;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetApiTest extends TestCase
{
    use RefreshDatabase;

    protected function context(): array
    {
        $landlord = Landlord::factory()->create();

        $user = User::factory()->create([
            'landlord_id' => $landlord->id,
            'role' => User::ROLE_OWNER,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $property = Property::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $unitType = UnitType::factory()->create();

        $unit = Unit::factory()->create([
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $tenant = Tenant::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $assetType = AssetType::factory()->create();

        return compact('user', 'unit', 'tenant', 'assetType');
    }

    public function test_owner_can_list_assets(): void
    {
        ['user' => $user, 'unit' => $unit, 'assetType' => $assetType] = $this->context();

        Asset::factory()->count(2)->create([
            'unit_id' => $unit->id,
            'asset_type_id' => $assetType->id,
        ]);

        Asset::factory()->count(2)->create(); // other landlord

        $response = $this->getJson('/api/v1/assets');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_owner_can_create_asset(): void
    {
        ['unit' => $unit, 'tenant' => $tenant, 'assetType' => $assetType] = $this->context();

        $payload = [
            'asset_type_id' => $assetType->id,
            'unit_id' => $unit->id,
            'ownership' => 'tenant',
            'tenant_id' => $tenant->id,
            'name' => 'Dishwasher',
            'brand' => 'BrandX',
            'status' => 'maintenance',
        ];

        $response = $this->postJson('/api/v1/assets', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Dishwasher');

        $this->assertDatabaseHas('assets', [
            'name' => 'Dishwasher',
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_owner_can_update_asset(): void
    {
        ['user' => $user, 'unit' => $unit, 'assetType' => $assetType] = $this->context();

        $asset = Asset::factory()->create([
            'unit_id' => $unit->id,
            'asset_type_id' => $assetType->id,
            'ownership' => 'landlord',
        ]);

        $response = $this->putJson("/api/v1/assets/{$asset->id}", [
            'status' => 'broken',
            'ownership' => 'landlord',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'broken');

        $this->assertDatabaseHas('assets', [
            'id' => $asset->id,
            'status' => 'broken',
        ]);
    }

    public function test_owner_can_delete_asset(): void
    {
        ['unit' => $unit, 'assetType' => $assetType] = $this->context();

        $asset = Asset::factory()->create([
            'unit_id' => $unit->id,
            'asset_type_id' => $assetType->id,
        ]);

        $response = $this->deleteJson("/api/v1/assets/{$asset->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('assets', [
            'id' => $asset->id,
        ]);
    }

    public function test_cannot_view_foreign_asset(): void
    {
        $this->context();

        $foreignAsset = Asset::factory()->create();

        $this->getJson("/api/v1/assets/{$foreignAsset->id}")
            ->assertForbidden();
    }
}

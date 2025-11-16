<?php

namespace Tests\Feature\Api\V1;

use App\Models\AssetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetTypeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_asset_types(): void
    {
        $this->actingAsOwner();

        AssetType::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/asset-types');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'category']]]);
    }

    public function test_owner_can_create_asset_type(): void
    {
        $this->actingAsOwner();

        $payload = [
            'name' => 'Generator',
            'category' => 'other',
        ];

        $response = $this->postJson('/api/v1/asset-types', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Generator');

        $this->assertDatabaseHas('asset_types', [
            'name' => 'Generator',
        ]);
    }

    public function test_owner_can_update_asset_type(): void
    {
        $this->actingAsOwner();

        $assetType = AssetType::factory()->create([
            'name' => 'Old Type',
        ]);

        $response = $this->putJson("/api/v1/asset-types/{$assetType->id}", [
            'name' => 'Updated Type',
            'is_active' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Updated Type');

        $this->assertDatabaseHas('asset_types', [
            'id' => $assetType->id,
            'name' => 'Updated Type',
            'is_active' => false,
        ]);
    }

    public function test_owner_can_delete_asset_type(): void
    {
        $this->actingAsOwner();

        $assetType = AssetType::factory()->create();

        $response = $this->deleteJson("/api/v1/asset-types/{$assetType->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('asset_types', [
            'id' => $assetType->id,
        ]);
    }
}

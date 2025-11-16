<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_tenants(): void
    {
        $user = $this->actingAsOwner();

        Tenant::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
        ]);

        $response = $this->getJson('/api/v1/tenants');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'full_name', 'phone', 'status'],
                ],
            ]);
    }

    public function test_owner_can_create_tenant(): void
    {
        $user = $this->actingAsOwner();

        $payload = [
            'full_name' => 'Adam Ismail',
            'email' => 'adam@example.com',
            'phone' => '7700001',
            'status' => 'active',
        ];

        $response = $this->postJson('/api/v1/tenants', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.full_name', $payload['full_name']);

        $this->assertDatabaseHas('tenants', [
            'landlord_id' => $user->landlord_id,
            'email' => 'adam@example.com',
        ]);
    }

    public function test_owner_can_update_tenant(): void
    {
        $user = $this->actingAsOwner();

        $tenant = Tenant::factory()->create([
            'landlord_id' => $user->landlord_id,
            'full_name' => 'Old Name',
            'phone' => '7700008',
        ]);

        $response = $this->putJson("/api/v1/tenants/{$tenant->id}", [
            'full_name' => 'New Name',
            'phone' => '7700010',
            'status' => 'inactive',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.full_name', 'New Name');

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'full_name' => 'New Name',
            'status' => 'inactive',
        ]);
    }

    public function test_owner_can_delete_tenant(): void
    {
        $user = $this->actingAsOwner();

        $tenant = Tenant::factory()->create([
            'landlord_id' => $user->landlord_id,
        ]);

        $response = $this->deleteJson("/api/v1/tenants/{$tenant->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('tenants', [
            'id' => $tenant->id,
        ]);
    }

    public function test_cannot_access_other_landlord_tenant(): void
    {
        $this->actingAsOwner();

        $foreignTenant = Tenant::factory()->create(); // other landlord

        $this->getJson("/api/v1/tenants/{$foreignTenant->id}")
            ->assertForbidden();
    }
}

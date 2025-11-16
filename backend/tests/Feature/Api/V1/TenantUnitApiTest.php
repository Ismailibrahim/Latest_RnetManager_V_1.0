<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantUnitApiTest extends TestCase
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

        $tenant = Tenant::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $property = Property::factory()->create([
            'landlord_id' => $landlord->id,
        ]);

        $unitType = UnitType::factory()->create([
            'is_active' => true,
        ]);

        $unit = Unit::factory()->create([
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
            'is_occupied' => false,
        ]);

        Sanctum::actingAs($user);

        return compact('user', 'tenant', 'property', 'unit');
    }

    public function test_owner_can_list_lease_records(): void
    {
        ['user' => $user, 'tenant' => $tenant, 'unit' => $unit] = $this->setupContext();

        TenantUnit::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
        ]);

        $response = $this->getJson('/api/v1/tenant-units');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'tenant_id', 'unit_id', 'status'],
                ],
            ]);
    }

    public function test_owner_can_create_lease_and_occupy_unit(): void
    {
        ['tenant' => $tenant, 'unit' => $unit, 'user' => $user] = $this->setupContext();

        $payload = [
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'lease_start' => '2025-01-01',
            'lease_end' => '2025-12-31',
            'monthly_rent' => 18000,
            'security_deposit_paid' => 20000,
            'status' => 'active',
        ];

        $response = $this->postJson('/api/v1/tenant-units', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('tenant_units', [
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
        ]);

        $this->assertTrue($unit->fresh()->is_occupied);
    }

    public function test_owner_can_update_lease_and_release_unit(): void
    {
        ['tenant' => $tenant, 'unit' => $unit, 'user' => $user] = $this->setupContext();

        $lease = TenantUnit::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'status' => 'active',
        ]);

        $unit->update(['is_occupied' => true]);

        $response = $this->putJson("/api/v1/tenant-units/{$lease->id}", [
            'status' => 'ended',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'ended');

        $this->assertFalse($unit->fresh()->is_occupied);
    }

    public function test_owner_can_delete_lease(): void
    {
        ['tenant' => $tenant, 'unit' => $unit, 'user' => $user] = $this->setupContext();

        $lease = TenantUnit::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'status' => 'ended',
        ]);

        $response = $this->deleteJson("/api/v1/tenant-units/{$lease->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('tenant_units', [
            'id' => $lease->id,
        ]);
    }

    public function test_cannot_view_foreign_lease(): void
    {
        $this->setupContext(); // acting user

        $foreignLease = TenantUnit::factory()->create(); // belongs to different landlord

        $this->getJson("/api/v1/tenant-units/{$foreignLease->id}")
            ->assertForbidden();
    }
}
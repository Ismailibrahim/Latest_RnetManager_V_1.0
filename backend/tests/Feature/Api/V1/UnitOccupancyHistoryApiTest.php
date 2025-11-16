<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnitOccupancyHistoryApiTest extends TestCase
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

        $tenantUnit = TenantUnit::factory()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'landlord_id' => $landlord->id,
            'status' => 'ended',
        ]);

        return compact('user', 'unit', 'tenant', 'tenantUnit');
    }

    public function test_owner_can_list_history(): void
    {
        ['unit' => $unit, 'tenant' => $tenant, 'tenantUnit' => $tenantUnit] = $this->context();

        UnitOccupancyHistory::factory()->count(2)->create([
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        UnitOccupancyHistory::factory()->create(); // other landlord

        $this->getJson('/api/v1/unit-occupancy-history')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_owner_can_create_history(): void
    {
        ['unit' => $unit, 'tenant' => $tenant, 'tenantUnit' => $tenantUnit] = $this->context();

        $payload = [
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'tenant_unit_id' => $tenantUnit->id,
            'action' => 'move_in',
            'action_date' => '2025-02-01',
            'rent_amount' => 18000,
            'notes' => 'Initial move in recorded manually.',
        ];

        $this->postJson('/api/v1/unit-occupancy-history', $payload)
            ->assertCreated()
            ->assertJsonPath('data.action', 'move_in');

        $this->assertDatabaseHas('unit_occupancy_history', [
            'tenant_unit_id' => $tenantUnit->id,
            'action' => 'move_in',
        ]);
    }

    public function test_owner_can_update_history(): void
    {
        ['unit' => $unit, 'tenant' => $tenant, 'tenantUnit' => $tenantUnit] = $this->context();

        $history = UnitOccupancyHistory::factory()->create([
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'tenant_unit_id' => $tenantUnit->id,
            'notes' => 'Original note',
        ]);

        $this->putJson("/api/v1/unit-occupancy-history/{$history->id}", [
            'notes' => 'Updated note',
        ])->assertOk()
            ->assertJsonPath('data.notes', 'Updated note');

        $this->assertDatabaseHas('unit_occupancy_history', [
            'id' => $history->id,
            'notes' => 'Updated note',
        ]);
    }

    public function test_owner_can_delete_history(): void
    {
        ['unit' => $unit, 'tenant' => $tenant, 'tenantUnit' => $tenantUnit] = $this->context();

        $history = UnitOccupancyHistory::factory()->create([
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $this->deleteJson("/api/v1/unit-occupancy-history/{$history->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('unit_occupancy_history', [
            'id' => $history->id,
        ]);
    }

    public function test_cannot_view_foreign_history(): void
    {
        $this->context();

        $foreignHistory = UnitOccupancyHistory::factory()->create();

        $this->getJson("/api/v1/unit-occupancy-history/{$foreignHistory->id}")
            ->assertForbidden();
    }
}

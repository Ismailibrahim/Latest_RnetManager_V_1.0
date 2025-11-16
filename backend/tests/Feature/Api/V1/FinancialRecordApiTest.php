<?php

namespace Tests\Feature\Api\V1;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinancialRecordApiTest extends TestCase
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

        $unitType = UnitType::factory()->create();

        $unit = Unit::factory()->create([
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $tenantUnit = TenantUnit::factory()->create([
            'landlord_id' => $landlord->id,
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        return compact('user', 'tenantUnit');
    }

    public function test_owner_can_list_financial_records(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        FinancialRecord::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $response = $this->getJson('/api/v1/financial-records');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'tenant_unit_id', 'type', 'status'],
                ],
            ]);
    }

    public function test_owner_can_create_financial_record(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        $payload = [
            'tenant_unit_id' => $tenantUnit->id,
            'type' => 'rent',
            'category' => 'monthly_rent',
            'amount' => 18000,
            'description' => 'January rent',
            'transaction_date' => '2025-01-01',
            'status' => 'completed',
        ];

        $response = $this->postJson('/api/v1/financial-records', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.description', 'January rent');

        $this->assertDatabaseHas('financial_records', [
            'tenant_unit_id' => $tenantUnit->id,
            'description' => 'January rent',
        ]);
    }

    public function test_owner_can_update_financial_record(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        $record = FinancialRecord::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            'description' => 'Old desc',
        ]);

        $response = $this->putJson("/api/v1/financial-records/{$record->id}", [
            'description' => 'Updated desc',
            'amount' => 21000,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.description', 'Updated desc');

        $this->assertDatabaseHas('financial_records', [
            'id' => $record->id,
            'description' => 'Updated desc',
            'amount' => 21000,
        ]);
    }

    public function test_owner_can_delete_financial_record(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        $record = FinancialRecord::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $response = $this->deleteJson("/api/v1/financial-records/{$record->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('financial_records', [
            'id' => $record->id,
        ]);
    }

    public function test_cannot_access_foreign_financial_record(): void
    {
        $this->setupContext();

        $foreignRecord = FinancialRecord::factory()->create();

        $this->getJson("/api/v1/financial-records/{$foreignRecord->id}")
            ->assertForbidden();
    }
}

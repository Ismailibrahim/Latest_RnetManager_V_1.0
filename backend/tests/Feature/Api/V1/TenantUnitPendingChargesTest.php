<?php

namespace Tests\Feature\Api\V1;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\Property;
use App\Models\RentInvoice;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantUnitPendingChargesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUpTestContext(): array
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

    public function test_it_returns_pending_charges_for_tenant_unit(): void
    {
        ['tenantUnit' => $tenantUnit, 'user' => $user] = $this->setUpTestContext();

        $invoice = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'landlord_id' => $user->landlord_id,
            'status' => 'sent',
            'rent_amount' => 2500,
            'late_fee' => 150,
        ]);

        $record = FinancialRecord::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'landlord_id' => $user->landlord_id,
            'status' => 'pending',
            'type' => 'fee',
            'category' => 'late_fee',
            'amount' => 350,
        ]);

        // Foreign records should not leak into the response.
        RentInvoice::factory()->create();
        FinancialRecord::factory()->create();

        $response = $this->getJson("/api/v1/tenant-units/{$tenantUnit->id}/pending-charges");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment([
                'source_type' => 'rent_invoice',
                'source_id' => $invoice->id,
                'suggested_payment_type' => 'rent',
            ])
            ->assertJsonFragment([
                'source_type' => 'financial_record',
                'source_id' => $record->id,
                'suggested_payment_type' => 'fee',
            ]);
    }

    public function test_it_rejects_access_to_foreign_tenant_units(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setUpTestContext();

        $otherTenantUnit = TenantUnit::factory()->create();

        $this->getJson("/api/v1/tenant-units/{$otherTenantUnit->id}/pending-charges")
            ->assertForbidden();

        $this->getJson('/api/v1/tenant-units/999999/pending-charges')
            ->assertNotFound();
    }
}




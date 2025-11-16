<?php

namespace Tests\Feature\Api\V1;

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

class RentInvoiceApiTest extends TestCase
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

    public function test_owner_can_list_rent_invoices(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        RentInvoice::factory()->count(2)->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $response = $this->getJson('/api/v1/rent-invoices');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'invoice_number', 'status'],
                ],
            ]);
    }

    public function test_owner_can_create_rent_invoice(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        $payload = [
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_number' => 'INV-1001',
            'invoice_date' => '2025-01-01',
            'due_date' => '2025-01-05',
            'rent_amount' => 18000,
            'status' => 'sent',
        ];

        $response = $this->postJson('/api/v1/rent-invoices', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.invoice_number', 'INV-1001');

        $this->assertDatabaseHas('rent_invoices', [
            'invoice_number' => 'INV-1001',
        ]);
    }

    public function test_owner_can_update_rent_invoice(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_number' => 'INV-2001',
        ]);

        $response = $this->putJson("/api/v1/rent-invoices/{$invoice->id}", [
            'status' => 'paid',
            'paid_date' => '2025-01-03',
            'payment_method' => 'bank_transfer',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('rent_invoices', [
            'id' => $invoice->id,
            'status' => 'paid',
        ]);
    }

    public function test_owner_can_delete_rent_invoice(): void
    {
        ['user' => $user, 'tenantUnit' => $tenantUnit] = $this->setupContext();

        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $response = $this->deleteJson("/api/v1/rent-invoices/{$invoice->id}");

        $response->assertNoContent();

        $this->assertDatabaseMissing('rent_invoices', [
            'id' => $invoice->id,
        ]);
    }

    public function test_cannot_view_foreign_invoice(): void
    {
        $this->setupContext();

        $foreignInvoice = RentInvoice::factory()->create();

        $this->getJson("/api/v1/rent-invoices/{$foreignInvoice->id}")
            ->assertForbidden();
    }
}

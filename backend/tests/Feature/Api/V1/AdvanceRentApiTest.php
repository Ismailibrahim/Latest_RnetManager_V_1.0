<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\PaymentMethod;
use App\Models\RentInvoice;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvanceRentApiTest extends TestCase
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

        $property = \App\Models\Property::factory()->create([
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
            'lease_start' => '2025-01-01',
            'lease_end' => '2025-12-31',
            'monthly_rent' => 15000,
            'advance_rent_months' => 0,
            'advance_rent_amount' => 0,
        ]);

        PaymentMethod::create(['name' => 'bank_transfer', 'is_active' => true]);
        PaymentMethod::create(['name' => 'cash', 'is_active' => true]);

        Sanctum::actingAs($user);

        return compact('user', 'tenantUnit');
    }

    public function test_owner_can_collect_advance_rent(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        $payload = [
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'transaction_date' => '2025-01-01',
            'payment_method' => 'bank_transfer',
            'reference_number' => 'REF-123',
            'notes' => 'Test advance rent',
        ];

        $response = $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/advance-rent", $payload);

        $response->assertOk()
            ->assertJsonPath('data.advance_rent_months', 3)
            ->assertJsonPath('data.advance_rent_amount', 45000)
            ->assertJsonPath('data.advance_rent_remaining', 45000);

        $this->assertDatabaseHas('tenant_units', [
            'id' => $tenantUnit->id,
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 0,
            'advance_rent_collected_date' => '2025-01-01',
        ]);

        $this->assertDatabaseHas('financial_records', [
            'tenant_unit_id' => $tenantUnit->id,
            'type' => 'rent',
            'amount' => 45000,
            'status' => 'completed',
        ]);
    }

    public function test_collect_advance_rent_validates_required_fields(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        $response = $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/advance-rent", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['advance_rent_months', 'advance_rent_amount', 'transaction_date']);
    }

    public function test_owner_can_retroactively_apply_advance_rent(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        // Collect advance rent first
        $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/advance-rent", [
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'transaction_date' => '2025-01-01',
            'payment_method' => 'bank_transfer',
        ]);

        // Create some existing invoices
        $invoice1 = RentInvoice::factory()->create([
            'landlord_id' => $tenantUnit->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $invoice2 = RentInvoice::factory()->create([
            'landlord_id' => $tenantUnit->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-02-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $response = $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/retroactive-advance-rent");

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'processed',
                'applied',
                'invoices' => [
                    '*' => ['id', 'invoice_number', 'invoice_date', 'amount_applied', 'total_applied', 'fully_covered'],
                ],
            ])
            ->assertJsonPath('processed', 2)
            ->assertJsonPath('applied', 30000);

        // Verify invoices are updated
        $invoice1->refresh();
        $invoice2->refresh();

        $this->assertEquals('paid', $invoice1->status);
        $this->assertEquals('paid', $invoice2->status);
        $this->assertTrue($invoice1->is_advance_covered);
        $this->assertTrue($invoice2->is_advance_covered);
    }

    public function test_retroactive_apply_returns_error_when_no_advance_rent(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        $response = $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/retroactive-advance-rent");

        $response->assertStatus(400)
            ->assertJsonPath('message', 'No advance rent found for this tenant unit.');
    }

    public function test_cannot_collect_advance_rent_for_foreign_tenant_unit(): void
    {
        $this->setupContext(); // acting user

        $foreignTenantUnit = TenantUnit::factory()->create(); // belongs to different landlord

        $payload = [
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'transaction_date' => '2025-01-01',
            'payment_method' => 'bank_transfer',
        ];

        $response = $this->postJson("/api/v1/tenant-units/{$foreignTenantUnit->id}/advance-rent", $payload);

        $response->assertForbidden();
    }

    public function test_invoice_generation_applies_advance_rent_automatically(): void
    {
        ['tenantUnit' => $tenantUnit] = $this->setupContext();

        // Collect advance rent first
        $this->postJson("/api/v1/tenant-units/{$tenantUnit->id}/advance-rent", [
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'transaction_date' => '2025-01-01',
            'payment_method' => 'bank_transfer',
        ]);

        // Create invoice within coverage period
        $payload = [
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-15',
            'due_date' => '2025-02-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ];

        $response = $this->postJson('/api/v1/rent-invoices', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.advance_rent_applied', 15000)
            ->assertJsonPath('data.is_advance_covered', true)
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('rent_invoices', [
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-15',
            'advance_rent_applied' => 15000,
            'is_advance_covered' => true,
            'status' => 'paid',
        ]);
    }
}


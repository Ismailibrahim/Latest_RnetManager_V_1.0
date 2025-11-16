<?php

namespace Tests\Feature\Api\V1;

use App\Models\Landlord;
use App\Models\Property;
use App\Models\SecurityDepositRefund;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityDepositRefundApiTest extends TestCase
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

        return compact('user', 'landlord', 'tenantUnit');
    }

    public function test_owner_can_list_refunds(): void
    {
        ['landlord' => $landlord, 'tenantUnit' => $tenantUnit] = $this->context();

        SecurityDepositRefund::factory()->count(2)->create([
            'landlord_id' => $landlord->id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        SecurityDepositRefund::factory()->create(); // other landlord

        $this->getJson('/api/v1/security-deposit-refunds')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_owner_can_create_refund(): void
    {
        ['landlord' => $landlord, 'tenantUnit' => $tenantUnit] = $this->context();

        $payload = [
            'tenant_unit_id' => $tenantUnit->id,
            'refund_number' => 'REF-1001',
            'refund_date' => '2025-01-31',
            'original_deposit' => 15000,
            'deductions' => 2500,
            'refund_amount' => 12500,
            'deduction_reasons' => ['Cleaning - 1500', 'Repairs - 1000'],
            'status' => 'processed',
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'TXN-001',
            'receipt_generated' => true,
            'receipt_number' => 'RCPT-001',
        ];

        $this->postJson('/api/v1/security-deposit-refunds', $payload)
            ->assertCreated()
            ->assertJsonPath('data.refund_number', 'REF-1001');

        $this->assertDatabaseHas('security_deposit_refunds', [
            'landlord_id' => $landlord->id,
            'refund_number' => 'REF-1001',
            'tenant_unit_id' => $tenantUnit->id,
        ]);
    }

    public function test_owner_can_update_refund(): void
    {
        ['landlord' => $landlord, 'tenantUnit' => $tenantUnit] = $this->context();

        $refund = SecurityDepositRefund::factory()->create([
            'landlord_id' => $landlord->id,
            'tenant_unit_id' => $tenantUnit->id,
            'status' => 'pending',
        ]);

        $this->putJson("/api/v1/security-deposit-refunds/{$refund->id}", [
            'status' => 'processed',
            'receipt_generated' => true,
        ])->assertOk()
            ->assertJsonPath('data.status', 'processed')
            ->assertJsonPath('data.receipt_generated', true);

        $this->assertDatabaseHas('security_deposit_refunds', [
            'id' => $refund->id,
            'status' => 'processed',
            'receipt_generated' => true,
        ]);
    }

    public function test_owner_can_delete_refund(): void
    {
        ['landlord' => $landlord, 'tenantUnit' => $tenantUnit] = $this->context();

        $refund = SecurityDepositRefund::factory()->create([
            'landlord_id' => $landlord->id,
            'tenant_unit_id' => $tenantUnit->id,
        ]);

        $this->deleteJson("/api/v1/security-deposit-refunds/{$refund->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('security_deposit_refunds', [
            'id' => $refund->id,
        ]);
    }

    public function test_cannot_view_foreign_refund(): void
    {
        $this->context();

        $foreign = SecurityDepositRefund::factory()->create();

        $this->getJson("/api/v1/security-deposit-refunds/{$foreign->id}")
            ->assertForbidden();
    }
}

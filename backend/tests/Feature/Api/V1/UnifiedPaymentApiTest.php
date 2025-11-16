<?php

namespace Tests\Feature\Api\V1;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnifiedPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected Landlord $landlord;

    protected User $owner;

    protected TenantUnit $tenantUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->landlord = Landlord::factory()->create();

        $this->owner = User::factory()->create([
            'landlord_id' => $this->landlord->id,
            'role' => User::ROLE_OWNER,
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->owner);

        $property = Property::factory()->create([
            'landlord_id' => $this->landlord->id,
        ]);

        $unitType = UnitType::factory()->create();

        $unit = Unit::factory()->create([
            'landlord_id' => $this->landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $tenant = Tenant::factory()->create([
            'landlord_id' => $this->landlord->id,
        ]);

        $this->tenantUnit = TenantUnit::factory()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'landlord_id' => $this->landlord->id,
            'status' => 'active',
            'lease_start' => now()->subYear()->toDateString(),
            'lease_end' => now()->addMonths(6)->toDateString(),
        ]);
    }

    public function test_owner_can_create_unified_payment_entry(): void
    {
        $response = $this->postJson('/api/v1/payments', [
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'currency' => 'aed',
            'description' => 'November rent',
            'transaction_date' => Carbon::now()->toDateString(),
            'status' => 'pending',
            'payment_method' => 'bank_transfer',
            'reference_number' => 'INV-9001',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.payment_type', 'rent')
            ->assertJsonPath('data.currency', 'AED')
            ->assertJsonPath('data.entry_origin', 'native');

        $this->assertDatabaseHas('unified_payment_entries', [
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000.00,
            'status' => 'pending',
            'currency' => 'AED',
        ]);
    }

    public function test_can_capture_native_payment(): void
    {
        $createResponse = $this->postJson('/api/v1/payments', [
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 12500,
            'description' => 'December rent',
            'status' => 'pending',
        ]);

        $compositeId = $createResponse->json('data.composite_id');

        $captureResponse = $this->postJson("/api/v1/payments/{$compositeId}/capture", [
            'status' => 'completed',
            'transaction_date' => '2025-12-05',
            'payment_method' => 'cash',
            'reference_number' => 'RCPT-1001',
        ]);

        $captureResponse->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.reference_number', 'RCPT-1001')
            ->assertJsonPath('data.captured_at', fn ($value) => ! empty($value));

        $entryId = (int) str($compositeId)->after(':')->value();

        $this->assertDatabaseHas('unified_payment_entries', [
            'id' => $entryId,
            'status' => 'completed',
        ]);
    }

    public function test_voiding_requires_native_entry(): void
    {
        $record = FinancialRecord::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'type' => 'rent',
            'category' => 'monthly_rent',
            'status' => 'completed',
        ]);

        $compositeId = sprintf('financial_record:%d', $record->id);

        $response = $this->postJson("/api/v1/payments/{$compositeId}/void", [
            'status' => 'cancelled',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_void_native_payment(): void
    {
        /** @var UnifiedPaymentEntry $entry */
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'created_by' => $this->owner->id,
            'status' => 'pending',
            'payment_type' => 'rent',
            'flow_direction' => 'income',
        ]);

        $compositeId = sprintf('unified_payment_entry:%d', $entry->id);

        $response = $this->postJson("/api/v1/payments/{$compositeId}/void", [
            'status' => 'cancelled',
            'reason' => 'Tenant vacated early',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.metadata.void_reason', 'Tenant vacated early')
            ->assertJsonPath('data.voided_at', fn ($value) => ! empty($value));

        $this->assertDatabaseHas('unified_payment_entries', [
            'id' => $entry->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_index_route_returns_payments(): void
    {
        $this->postJson('/api/v1/payments', [
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 10000,
            'status' => 'pending',
        ])->assertCreated();

        $response = $this->getJson('/api/v1/payments');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.payment_type', 'rent');
    }
}



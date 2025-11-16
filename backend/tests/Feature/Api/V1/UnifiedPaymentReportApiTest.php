<?php

namespace Tests\Feature\Api\V1;

use App\Models\FinancialRecord;
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

class UnifiedPaymentReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected Landlord $landlord;

    protected User $owner;

    protected TenantUnit $tenantUnit;

    protected Unit $unit;

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

        $this->unit = Unit::factory()->create([
            'landlord_id' => $this->landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
        ]);

        $tenant = Tenant::factory()->create([
            'landlord_id' => $this->landlord->id,
        ]);

        $this->tenantUnit = TenantUnit::factory()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $this->unit->id,
            'landlord_id' => $this->landlord->id,
            'status' => 'active',
            'lease_start' => now()->subYear()->toDateString(),
            'lease_end' => now()->addMonths(6)->toDateString(),
        ]);
    }

    public function test_owner_can_list_payments(): void
    {
        $this->createRentRecord(['transaction_date' => '2025-02-01']);

        SecurityDepositRefund::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'refund_number' => 'REF-1001',
            'refund_date' => '2025-02-05',
            'original_deposit' => 5000,
            'deductions' => 500,
            'refund_amount' => 4500,
            'status' => 'processed',
        ]);

        // Noise data for another landlord
        FinancialRecord::factory()->create(); // unrelated landlord

        $response = $this->getJson('/api/v1/reports/unified-payments');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['payment_type' => 'rent'])
            ->assertJsonFragment(['payment_type' => 'security_refund'])
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'payment_type',
                        'flow_direction',
                        'amount',
                        'status',
                        'transaction_date',
                        'tenant_name',
                    ],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_can_filter_by_payment_type_and_dates(): void
    {
        $this->createRentRecord([
            'transaction_date' => '2025-01-15',
            'amount' => 12000,
            'status' => 'completed',
        ]);

        $this->createRentRecord([
            'transaction_date' => '2025-03-01',
            'amount' => 13000,
            'status' => 'completed',
        ]);

        $this->createRentRecord([
            'transaction_date' => '2025-04-01',
            'amount' => 14000,
            'status' => 'completed',
        ]);

        $response = $this->getJson('/api/v1/reports/unified-payments?payment_type=rent&from=2025-02-01&to=2025-03-15');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.transaction_date', '2025-03-01');
    }

    public function test_can_filter_by_flow_direction(): void
    {
        $this->createRentRecord([
            'transaction_date' => '2025-02-10',
            'amount' => 15000,
            'status' => 'completed',
        ]);

        SecurityDepositRefund::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'refund_number' => 'REF-2001',
            'refund_date' => '2025-02-15',
            'original_deposit' => 6000,
            'deductions' => 0,
            'refund_amount' => 6000,
            'status' => 'processed',
        ]);

        $response = $this->getJson('/api/v1/reports/unified-payments?flow_direction=income');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.flow_direction', 'income');
    }

    protected function createRentRecord(array $overrides = []): FinancialRecord
    {
        return FinancialRecord::factory()->create(array_merge([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'type' => 'rent',
            'category' => 'monthly_rent',
            'amount' => 12500,
            'description' => 'Monthly rent payment',
            'transaction_date' => '2025-02-01',
            'due_date' => '2025-02-05',
            'status' => 'completed',
        ], $overrides));
    }
}

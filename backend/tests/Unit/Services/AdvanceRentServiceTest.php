<?php

namespace Tests\Unit\Services;

use App\Models\FinancialRecord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Services\AdvanceRentService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdvanceRentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AdvanceRentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AdvanceRentService();
    }

    public function test_collect_advance_rent_creates_financial_record(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'monthly_rent' => 15000,
            'advance_rent_months' => 0,
            'advance_rent_amount' => 0,
            'advance_rent_used' => 0,
        ]);

        $result = $this->service->collectAdvanceRent(
            tenantUnit: $tenantUnit,
            months: 3,
            amount: 45000,
            transactionDate: '2025-01-01',
            paymentMethod: 'bank_transfer',
            referenceNumber: 'REF-123',
            notes: 'Test advance rent collection'
        );

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
            'category' => 'monthly_rent',
            'amount' => 45000,
            'status' => 'completed',
            'payment_method' => 'bank_transfer',
            'reference_number' => 'REF-123',
        ]);

        $this->assertEquals(45000, $result['tenant_unit']->advance_rent_amount);
        $this->assertInstanceOf(FinancialRecord::class, $result['financial_record']);
    }

    public function test_check_advance_rent_coverage_returns_false_when_no_advance_rent(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'advance_rent_months' => 0,
            'advance_rent_amount' => 0,
        ]);

        $coverage = $this->service->checkAdvanceRentCoverage($tenantUnit, '2025-01-01');

        $this->assertFalse($coverage['covered']);
        $this->assertEquals(0.0, $coverage['remaining']);
        $this->assertFalse($coverage['can_fully_cover']);
    }

    public function test_check_advance_rent_coverage_returns_true_when_covered(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 0,
        ]);

        $coverage = $this->service->checkAdvanceRentCoverage($tenantUnit, '2025-01-15');

        $this->assertTrue($coverage['covered']);
        $this->assertEquals(45000, $coverage['remaining']);
        $this->assertTrue($coverage['can_fully_cover']);
    }

    public function test_apply_advance_rent_to_invoice_fully_covers_invoice(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'monthly_rent' => 15000,
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 0,
        ]);

        $invoice = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-01',
            'rent_amount' => 15000,
            'late_fee' => 0,
            'status' => 'generated',
            'advance_rent_applied' => 0,
            'is_advance_covered' => false,
        ]);

        $result = $this->service->applyAdvanceRentToInvoice($invoice, $tenantUnit);

        $this->assertEquals(15000, $result['applied']);
        $this->assertTrue($result['fully_covered']);

        $invoice->refresh();
        $this->assertEquals(15000, $invoice->advance_rent_applied);
        $this->assertTrue($invoice->is_advance_covered);
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals('2025-01-01', $invoice->paid_date->toDateString());

        $tenantUnit->refresh();
        $this->assertEquals(15000, $tenantUnit->advance_rent_used);
    }

    public function test_apply_advance_rent_to_invoice_partially_covers_invoice(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'monthly_rent' => 15000,
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 40000, // Only 5000 remaining
        ]);

        $invoice = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-15',
            'rent_amount' => 15000,
            'late_fee' => 0,
            'status' => 'generated',
        ]);

        $result = $this->service->applyAdvanceRentToInvoice($invoice, $tenantUnit);

        $this->assertEquals(5000, $result['applied']);
        $this->assertFalse($result['fully_covered']);

        $invoice->refresh();
        $this->assertEquals(5000, $invoice->advance_rent_applied);
        $this->assertFalse($invoice->is_advance_covered);
        $this->assertEquals('generated', $invoice->status); // Status not changed for partial
    }

    public function test_retroactively_apply_advance_rent_processes_invoices_chronologically(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'monthly_rent' => 15000,
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 0,
            'advance_rent_collected_date' => '2025-01-01',
        ]);

        // Create invoices in non-chronological order
        $invoice1 = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-02-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $invoice2 = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $invoice3 = RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-03-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $result = $this->service->retroactivelyApplyAdvanceRent($tenantUnit);

        $this->assertEquals(3, $result['processed']);
        $this->assertEquals(45000, $result['applied']);

        // Check invoices are marked as paid
        $invoice1->refresh();
        $invoice2->refresh();
        $invoice3->refresh();

        $this->assertEquals('paid', $invoice1->status);
        $this->assertEquals('paid', $invoice2->status);
        $this->assertEquals('paid', $invoice3->status);

        $this->assertTrue($invoice1->is_advance_covered);
        $this->assertTrue($invoice2->is_advance_covered);
        $this->assertTrue($invoice3->is_advance_covered);

        // Verify they were processed chronologically by checking invoice dates
        $dates = array_column($result['invoices'], 'invoice_date');
        $this->assertEquals(['2025-01-01', '2025-02-01', '2025-03-01'], $dates);

        $tenantUnit->refresh();
        $this->assertEquals(45000, $tenantUnit->advance_rent_used);
    }

    public function test_retroactively_apply_advance_rent_stops_when_advance_rent_exhausted(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'monthly_rent' => 15000,
            'advance_rent_months' => 2,
            'advance_rent_amount' => 30000,
            'advance_rent_used' => 0,
        ]);

        // Create 3 invoices but only 2 months of advance rent
        RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-02-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-03-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $result = $this->service->retroactivelyApplyAdvanceRent($tenantUnit);

        // Only first 2 invoices should be processed
        $this->assertEquals(2, $result['processed']);
        $this->assertEquals(30000, $result['applied']);

        $tenantUnit->refresh();
        $this->assertEquals(30000, $tenantUnit->advance_rent_used);
    }

    public function test_retroactively_apply_advance_rent_skips_cancelled_invoices(): void
    {
        $tenantUnit = TenantUnit::factory()->create([
            'lease_start' => '2025-01-01',
            'monthly_rent' => 15000,
            'advance_rent_months' => 3,
            'advance_rent_amount' => 45000,
            'advance_rent_used' => 0,
        ]);

        RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-01-01',
            'rent_amount' => 15000,
            'status' => 'cancelled', // Should be skipped
        ]);

        RentInvoice::factory()->create([
            'tenant_unit_id' => $tenantUnit->id,
            'invoice_date' => '2025-02-01',
            'rent_amount' => 15000,
            'status' => 'generated',
        ]);

        $result = $this->service->retroactivelyApplyAdvanceRent($tenantUnit);

        // Only the non-cancelled invoice should be processed
        $this->assertEquals(1, $result['processed']);
    }
}


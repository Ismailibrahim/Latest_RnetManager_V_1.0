<?php

namespace Tests\Unit\Services;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use App\Models\User;
use App\Services\UnifiedPayments\UnifiedPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UnifiedPaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    private UnifiedPaymentService $service;
    private Landlord $landlord;
    private User $user;
    private TenantUnit $tenantUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new UnifiedPaymentService();
        $this->landlord = Landlord::factory()->create();
        $this->user = User::factory()->create([
            'landlord_id' => $this->landlord->id,
            'role' => User::ROLE_OWNER,
            'is_active' => true,
        ]);
        $this->tenantUnit = TenantUnit::factory()->create([
            'landlord_id' => $this->landlord->id,
        ]);
    }

    public function test_create_validates_payment_type(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Unsupported payment type');

        $this->service->create([
            'payment_type' => 'invalid_type',
            'amount' => 1000,
        ], $this->user);
    }

    public function test_create_validates_tenant_unit_required(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('tenant/unit association is required');

        $this->service->create([
            'payment_type' => 'rent',
            'amount' => 1000,
        ], $this->user);
    }

    public function test_create_validates_tenant_unit_exists(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('tenant/unit is invalid');

        $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => 99999,
            'amount' => 1000,
        ], $this->user);
    }

    public function test_create_validates_amount(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Amount must be greater than 0');

        $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 0,
        ], $this->user);
    }

    public function test_create_validates_currency(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Currency must be a 3 character ISO code');

        $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 1000,
            'currency' => 'US',
        ], $this->user);
    }

    public function test_create_validates_status(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Invalid payment status');

        $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 1000,
            'status' => 'invalid_status',
        ], $this->user);
    }

    public function test_create_creates_pending_payment(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'currency' => 'MVR',
            'description' => 'November rent',
        ], $this->user);

        $this->assertInstanceOf(UnifiedPaymentEntry::class, $entry);
        $this->assertEquals('rent', $entry->payment_type);
        $this->assertEquals('income', $entry->flow_direction);
        $this->assertEquals(15000, $entry->amount);
        $this->assertEquals('MVR', $entry->currency);
        $this->assertEquals('pending', $entry->status);
        $this->assertEquals($this->landlord->id, $entry->landlord_id);
        $this->assertEquals($this->tenantUnit->id, $entry->tenant_unit_id);
        $this->assertEquals($this->user->id, $entry->created_by);
    }

    public function test_create_sets_captured_at_for_completed_status(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
        ], $this->user);

        $this->assertEquals('completed', $entry->status);
        $this->assertNotNull($entry->captured_at);
    }

    public function test_create_sets_voided_at_for_cancelled_status(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'cancelled',
        ], $this->user);

        $this->assertEquals('cancelled', $entry->status);
        $this->assertNotNull($entry->voided_at);
    }

    public function test_create_updates_rent_invoice_status_when_completed(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'rent_amount' => 15000,
            'late_fee' => 0,
            'status' => 'sent',
        ]);

        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
            'source_type' => 'rent_invoice',
            'source_id' => $invoice->id,
            'payment_method' => 'bank_transfer',
        ], $this->user);

        $invoice->refresh();
        $this->assertEquals('paid', $invoice->status);
        $this->assertNotNull($invoice->paid_date);
        $this->assertEquals('bank_transfer', $invoice->payment_method);
    }

    public function test_create_updates_financial_record_status_when_completed(): void
    {
        $record = FinancialRecord::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 5000,
            'status' => 'pending',
        ]);

        $entry = $this->service->create([
            'payment_type' => 'fee',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 5000,
            'status' => 'completed',
            'source_type' => 'financial_record',
            'source_id' => $record->id,
            'payment_method' => 'cash',
        ], $this->user);

        $record->refresh();
        $this->assertEquals('completed', $record->status);
        $this->assertNotNull($record->paid_date);
        $this->assertEquals('cash', $record->payment_method);
    }

    public function test_create_creates_financial_record_from_payment(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
            'description' => 'November rent payment',
            'reference_number' => 'PAY-001',
        ], $this->user);

        $financialRecord = FinancialRecord::where('tenant_unit_id', $this->tenantUnit->id)
            ->where('amount', 15000)
            ->where('reference_number', 'PAY-001')
            ->first();

        $this->assertNotNull($financialRecord);
        $this->assertEquals('rent', $financialRecord->type);
        $this->assertEquals('monthly_rent', $financialRecord->category);
        $this->assertEquals('completed', $financialRecord->status);
        $this->assertEquals('November rent payment', $financialRecord->description);
    }

    public function test_create_does_not_create_financial_record_when_linked_to_rent_invoice(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
        ]);

        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
            'source_type' => 'rent_invoice',
            'source_id' => $invoice->id,
        ], $this->user);

        $count = FinancialRecord::where('tenant_unit_id', $this->tenantUnit->id)
            ->where('amount', 15000)
            ->count();

        $this->assertEquals(0, $count);
    }

    public function test_capture_validates_entry_status(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'status' => 'cancelled',
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Cannot capture a payment that has already been voided');

        $this->service->capture($entry, []);
    }

    public function test_capture_validates_capture_status(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'status' => 'pending',
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Capture status must be completed or partial');

        $this->service->capture($entry, ['status' => 'pending']);
    }

    public function test_capture_updates_entry_to_completed(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'status' => 'pending',
        ]);

        $captured = $this->service->capture($entry, [
            'status' => 'completed',
            'payment_method' => 'bank_transfer',
            'reference_number' => 'REF-123',
        ]);

        $this->assertEquals('completed', $captured->status);
        $this->assertEquals('bank_transfer', $captured->payment_method);
        $this->assertEquals('REF-123', $captured->reference_number);
        $this->assertNotNull($captured->captured_at);
        $this->assertNull($captured->voided_at);
    }

    public function test_capture_updates_linked_source_status(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'rent_amount' => 15000,
            'status' => 'sent',
        ]);

        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'status' => 'pending',
            'source_type' => 'rent_invoice',
            'source_id' => $invoice->id,
            'amount' => 15000,
        ]);

        $this->service->capture($entry, [
            'status' => 'completed',
            'payment_method' => 'bank_transfer',
        ]);

        $invoice->refresh();
        $this->assertEquals('paid', $invoice->status);
    }

    public function test_void_validates_entry_status(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'status' => 'cancelled',
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Payment has already been voided');

        $this->service->void($entry, []);
    }

    public function test_void_validates_void_status(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'status' => 'pending',
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Invalid void status');

        $this->service->void($entry, ['status' => 'pending']);
    }

    public function test_void_cancels_payment(): void
    {
        $entry = UnifiedPaymentEntry::factory()->create([
            'landlord_id' => $this->landlord->id,
            'status' => 'pending',
        ]);

        $voided = $this->service->void($entry, [
            'status' => 'cancelled',
            'reason' => 'Customer request',
        ]);

        $this->assertEquals('cancelled', $voided->status);
        $this->assertNotNull($voided->voided_at);
        $this->assertEquals('Customer request', $voided->metadata['void_reason'] ?? null);
    }

    public function test_create_handles_partial_payment_for_rent_invoice(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'rent_amount' => 15000,
            'status' => 'sent',
        ]);

        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 7500,
            'status' => 'partial',
            'source_type' => 'rent_invoice',
            'source_id' => $invoice->id,
        ], $this->user);

        $invoice->refresh();
        // Partial payment should not change invoice status to 'paid'
        $this->assertNotEquals('paid', $invoice->status);
    }

    public function test_create_handles_partial_payment_for_financial_record(): void
    {
        $record = FinancialRecord::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 10000,
            'status' => 'pending',
        ]);

        $entry = $this->service->create([
            'payment_type' => 'fee',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 5000,
            'status' => 'partial',
            'source_type' => 'financial_record',
            'source_id' => $record->id,
        ], $this->user);

        $record->refresh();
        $this->assertEquals('partial', $record->status);
        $this->assertNotNull($record->paid_date);
    }

    public function test_create_handles_other_income_without_tenant_unit(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'other_income',
            'amount' => 5000,
            'description' => 'Miscellaneous income',
        ], $this->user);

        $this->assertInstanceOf(UnifiedPaymentEntry::class, $entry);
        $this->assertEquals('other_income', $entry->payment_type);
        $this->assertEquals('income', $entry->flow_direction);
        $this->assertNull($entry->tenant_unit_id);
    }

    public function test_create_handles_source_id_in_format_type_colon_id(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'tenant_unit_id' => $this->tenantUnit->id,
            'rent_amount' => 15000,
            'status' => 'sent',
        ]);

        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
            'source_type' => 'rent_invoice',
            'source_id' => "rent_invoice:{$invoice->id}",
        ], $this->user);

        $invoice->refresh();
        $this->assertEquals('paid', $invoice->status);
    }

    public function test_create_sets_transaction_date_for_completed_status(): void
    {
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'status' => 'completed',
        ], $this->user);

        $this->assertNotNull($entry->transaction_date);
        $this->assertEquals(Carbon::now()->startOfDay()->format('Y-m-d'), $entry->transaction_date->format('Y-m-d'));
    }

    public function test_create_uses_provided_transaction_date(): void
    {
        $date = '2024-11-15';
        $entry = $this->service->create([
            'payment_type' => 'rent',
            'tenant_unit_id' => $this->tenantUnit->id,
            'amount' => 15000,
            'transaction_date' => $date,
        ], $this->user);

        $this->assertEquals($date, $entry->transaction_date->format('Y-m-d'));
    }
}


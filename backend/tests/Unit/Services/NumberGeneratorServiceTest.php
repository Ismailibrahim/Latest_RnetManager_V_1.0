<?php

namespace Tests\Unit\Services;

use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\SubscriptionInvoice;
use App\Services\NumberGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NumberGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    private NumberGeneratorService $service;
    private Landlord $landlord;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new NumberGeneratorService();
        $this->landlord = Landlord::factory()->create();
    }

    public function test_generate_rent_invoice_number(): void
    {
        $number = $this->service->generateRentInvoiceNumber($this->landlord->id);

        $this->assertStringStartsWith('RINV-', $number);
        $this->assertMatchesRegularExpression('/^RINV-\d{6}-\d{3}$/', $number);
    }

    public function test_generate_maintenance_invoice_number(): void
    {
        $number = $this->service->generateMaintenanceInvoiceNumber($this->landlord->id);

        $this->assertStringStartsWith('MINV-', $number);
        $this->assertMatchesRegularExpression('/^MINV-\d{6}-\d{3}$/', $number);
    }

    public function test_generate_security_deposit_refund_number(): void
    {
        $number = $this->service->generateSecurityDepositRefundNumber($this->landlord->id);

        $this->assertStringStartsWith('SDR-', $number);
        $this->assertMatchesRegularExpression('/^SDR-\d{6}-\d{3}$/', $number);
    }

    public function test_generate_receipt_number(): void
    {
        $number = $this->service->generateReceiptNumber($this->landlord->id);

        $this->assertStringStartsWith('RCPT-', $number);
        $this->assertMatchesRegularExpression('/^RCPT-\d{6}-\d{3}$/', $number);
    }

    public function test_generate_subscription_invoice_number(): void
    {
        $number = $this->service->generateSubscriptionInvoiceNumber($this->landlord->id);

        $this->assertStringStartsWith('SINV-', $number);
        $this->assertMatchesRegularExpression('/^SINV-\d{6}-\d{3}$/', $number);
    }

    public function test_numbers_are_sequential(): void
    {
        $number1 = $this->service->generateRentInvoiceNumber($this->landlord->id);
        $number2 = $this->service->generateRentInvoiceNumber($this->landlord->id);

        // Extract sequence numbers
        preg_match('/-(\d{3})$/', $number1, $matches1);
        preg_match('/-(\d{3})$/', $number2, $matches2);

        $seq1 = (int) $matches1[1];
        $seq2 = (int) $matches2[1];

        $this->assertEquals($seq1 + 1, $seq2);
    }

    public function test_numbers_are_unique_per_landlord(): void
    {
        $landlord2 = Landlord::factory()->create();

        $number1 = $this->service->generateRentInvoiceNumber($this->landlord->id);
        $number2 = $this->service->generateRentInvoiceNumber($landlord2->id);

        // Both should start with 001 for their respective landlords
        $this->assertStringEndsWith('-001', $number1);
        $this->assertStringEndsWith('-001', $number2);
    }

    public function test_rent_invoice_auto_generation(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'invoice_number' => null, // Will be auto-generated
        ]);

        $this->assertNotNull($invoice->invoice_number);
        $this->assertStringStartsWith('RINV-', $invoice->invoice_number);
    }

    public function test_maintenance_invoice_auto_generation(): void
    {
        $invoice = MaintenanceInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'invoice_number' => null, // Will be auto-generated
        ]);

        $this->assertNotNull($invoice->invoice_number);
        $this->assertStringStartsWith('MINV-', $invoice->invoice_number);
    }

    public function test_security_deposit_refund_auto_generation(): void
    {
        $refund = SecurityDepositRefund::factory()->create([
            'landlord_id' => $this->landlord->id,
            'refund_number' => null, // Will be auto-generated
        ]);

        $this->assertNotNull($refund->refund_number);
        $this->assertStringStartsWith('SDR-', $refund->refund_number);
    }

    public function test_receipt_number_auto_generation_on_update(): void
    {
        $refund = SecurityDepositRefund::factory()->create([
            'landlord_id' => $this->landlord->id,
            'receipt_generated' => false,
            'receipt_number' => null,
        ]);

        $this->assertNull($refund->receipt_number);

        $refund->receipt_generated = true;
        $refund->save();

        $refund->refresh();
        $this->assertNotNull($refund->receipt_number);
        $this->assertStringStartsWith('RCPT-', $refund->receipt_number);
    }

    public function test_custom_number_can_be_provided(): void
    {
        $invoice = RentInvoice::factory()->create([
            'landlord_id' => $this->landlord->id,
            'invoice_number' => 'CUSTOM-001',
        ]);

        $this->assertEquals('CUSTOM-001', $invoice->invoice_number);
    }

    public function test_get_prefix(): void
    {
        $this->assertEquals('RINV', NumberGeneratorService::getPrefix('rent_invoice'));
        $this->assertEquals('MINV', NumberGeneratorService::getPrefix('maintenance_invoice'));
        $this->assertEquals('SDR', NumberGeneratorService::getPrefix('security_deposit_refund'));
    }

    public function test_get_all_prefixes(): void
    {
        $prefixes = NumberGeneratorService::getAllPrefixes();

        $this->assertIsArray($prefixes);
        $this->assertArrayHasKey('rent_invoice', $prefixes);
        $this->assertArrayHasKey('maintenance_invoice', $prefixes);
        $this->assertArrayHasKey('receipt', $prefixes);
    }
}


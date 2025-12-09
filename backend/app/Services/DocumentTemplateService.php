<?php

namespace App\Services;

use App\Models\DocumentTemplate;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\UnifiedPaymentEntry;
use Illuminate\Support\Facades\Log;

class DocumentTemplateService
{
    public function __construct(
        private readonly SystemSettingsService $settingsService
    ) {
    }

    /**
     * Render template with data by replacing placeholders.
     *
     * @param  string  $template  HTML template with {{placeholder}} syntax
     * @param  array  $data  Data array with nested structure
     * @return string Rendered HTML
     */
    public function renderTemplate(string $template, array $data): string
    {
        return preg_replace_callback('/\{\{([^}]+)\}\}/', function ($matches) use ($data) {
            $key = trim($matches[1]);
            $path = explode('.', $key);
            $value = $data;

            foreach ($path as $p) {
                if (is_array($value) && array_key_exists($p, $value)) {
                    $value = $value[$p];
                } else {
                    return ''; // Return empty string if path not found
                }
            }

            // Convert to string, handle dates, numbers, etc.
            if ($value === null) {
                return '';
            }

            if (is_bool($value)) {
                return $value ? 'Yes' : 'No';
            }

            if (is_numeric($value)) {
                return (string) $value;
            }

            return (string) $value;
        }, $template);
    }

    /**
     * Prepare data for document rendering.
     *
     * @param  string  $type  Document type
     * @param  int  $id  Document ID
     * @return array Structured data for template
     */
    public function prepareDataForDocument(string $type, int $id): array
    {
        return match ($type) {
            'rent-invoice' => $this->prepareRentInvoiceData($id),
            'maintenance-invoice' => $this->prepareMaintenanceInvoiceData($id),
            'security-deposit-slip' => $this->prepareSecurityDepositSlipData($id),
            'advance-rent-receipt' => $this->prepareAdvanceRentReceiptData($id),
            'fee-collection-receipt' => $this->prepareFeeCollectionReceiptData($id),
            'security-deposit-refund' => $this->prepareSecurityDepositRefundData($id),
            'other-income-receipt' => $this->prepareOtherIncomeReceiptData($id),
            'payment-voucher' => $this->preparePaymentVoucherData($id),
            'unified-payment-entry' => $this->prepareUnifiedPaymentEntryData($id),
            default => throw new \InvalidArgumentException("Unknown document type: {$type}"),
        };
    }

    /**
     * Prepare data for rent invoice.
     */
    private function prepareRentInvoiceData(int $id): array
    {
        $invoice = RentInvoice::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        $tenantUnit = $invoice->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;
        $landlord = $invoice->landlord;

        $companySettings = $this->settingsService->getCompanySettings($invoice->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($invoice->landlord_id);

        $totalAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
        $advanceRentApplied = (float) ($invoice->advance_rent_applied ?? 0);
        $amountDue = $totalAmount - $advanceRentApplied;

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $invoice->invoice_number ?? '',
                'date' => $invoice->invoice_date?->format('d M Y') ?? '',
                'due_date' => $invoice->due_date?->format('d M Y') ?? '',
                'paid_date' => $invoice->paid_date?->format('d M Y') ?? '',
                'status' => $invoice->status ?? 'generated',
                'payment_method' => $invoice->payment_method ? strtoupper(str_replace('_', ' ', $invoice->payment_method)) : '',
            ],
            'amount' => [
                'rent' => number_format((float) $invoice->rent_amount, 2),
                'late_fee' => number_format((float) ($invoice->late_fee ?? 0), 2),
                'subtotal' => number_format($totalAmount, 2),
                'advance_rent_applied' => number_format($advanceRentApplied, 2),
                'total' => number_format($totalAmount, 2),
                'amount_due' => number_format(max(0, $amountDue), 2),
                'currency' => $currencySettings['primary'] ?? 'MVR',
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'advance_rent' => [
                'applied' => $advanceRentApplied > 0,
                'amount' => number_format($advanceRentApplied, 2),
                'fully_covered' => (bool) ($invoice->is_advance_covered ?? false),
            ],
        ];
    }

    /**
     * Prepare data for maintenance invoice.
     */
    private function prepareMaintenanceInvoiceData(int $id): array
    {
        $invoice = MaintenanceInvoice::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'maintenanceRequest',
            'landlord',
        ])->findOrFail($id);

        $tenantUnit = $invoice->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($invoice->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($invoice->landlord_id);

        $cost = (float) ($invoice->labor_cost ?? 0) + (float) ($invoice->parts_cost ?? 0);
        $subtotal = $cost + (float) ($invoice->misc_amount ?? 0);
        $tax = (float) ($invoice->tax_amount ?? 0);
        $discount = (float) ($invoice->discount_amount ?? 0);
        $grandTotal = (float) $invoice->grand_total;

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $invoice->invoice_number ?? '',
                'date' => $invoice->invoice_date?->format('d M Y') ?? '',
                'due_date' => $invoice->due_date?->format('d M Y') ?? '',
                'paid_date' => $invoice->paid_date?->format('d M Y') ?? '',
                'status' => $invoice->status ?? 'generated',
                'payment_method' => $invoice->payment_method ? strtoupper(str_replace('_', ' ', $invoice->payment_method)) : '',
                'reference_number' => $invoice->reference_number ?? '',
                'notes' => $invoice->notes ?? '',
            ],
            'amount' => [
                'labor_cost' => number_format((float) ($invoice->labor_cost ?? 0), 2),
                'parts_cost' => number_format((float) ($invoice->parts_cost ?? 0), 2),
                'misc_amount' => number_format((float) ($invoice->misc_amount ?? 0), 2),
                'cost' => number_format($cost, 2),
                'subtotal' => number_format($subtotal, 2),
                'tax' => number_format($tax, 2),
                'discount' => number_format($discount, 2),
                'total' => number_format($grandTotal, 2),
                'currency' => $currencySettings['primary'] ?? 'MVR',
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'maintenance_request' => [
                'id' => $invoice->maintenance_request_id ?? '',
                'description' => $invoice->maintenanceRequest?->description ?? '',
            ],
            'line_items' => $invoice->line_items ?? [],
        ];
    }

    /**
     * Prepare data for security deposit slip.
     */
    private function prepareSecurityDepositSlipData(int $id): array
    {
        $payment = UnifiedPaymentEntry::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        if ($payment->payment_type !== 'security_deposit') {
            throw new \InvalidArgumentException('Payment entry is not a security deposit');
        }

        $tenantUnit = $payment->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($payment->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($payment->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $payment->reference_number ?? 'SD-' . $payment->id,
                'date' => $payment->transaction_date?->format('d M Y') ?? '',
                'status' => $payment->status ?? 'pending',
                'payment_method' => $payment->payment_method ? strtoupper(str_replace('_', ' ', $payment->payment_method)) : '',
            ],
            'amount' => [
                'total' => number_format((float) $payment->amount, 2),
                'currency' => $payment->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'payment' => [
                'type' => 'Security Deposit',
                'description' => $payment->description ?? 'Security deposit collection',
                'reference_number' => $payment->reference_number ?? '',
            ],
        ];
    }

    /**
     * Prepare data for advance rent receipt.
     */
    private function prepareAdvanceRentReceiptData(int $id): array
    {
        $record = FinancialRecord::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        // Verify it's an advance rent record
        if ($record->type !== 'rent' || $record->category !== 'monthly_rent') {
            // Check if it's actually advance rent by checking tenant unit
            $tenantUnit = $record->tenantUnit;
            if (!$tenantUnit || !$tenantUnit->advance_rent_amount) {
                throw new \InvalidArgumentException('Financial record is not an advance rent receipt');
            }
        }

        $tenantUnit = $record->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($record->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($record->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $record->invoice_number ?? 'AR-' . $record->id,
                'date' => $record->transaction_date?->format('d M Y') ?? '',
                'paid_date' => $record->paid_date?->format('d M Y') ?? '',
                'status' => $record->status ?? 'completed',
                'payment_method' => $record->payment_method ? strtoupper(str_replace('_', ' ', $record->payment_method)) : '',
                'reference_number' => $record->reference_number ?? '',
            ],
            'amount' => [
                'total' => number_format((float) $record->amount, 2),
                'currency' => $record->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'advance_rent' => [
                'months' => $tenantUnit?->advance_rent_months ?? 0,
                'amount' => number_format((float) ($tenantUnit?->advance_rent_amount ?? 0), 2),
                'collected_date' => $tenantUnit?->advance_rent_collected_date?->format('d M Y') ?? '',
            ],
        ];
    }

    /**
     * Prepare data for fee collection receipt.
     */
    private function prepareFeeCollectionReceiptData(int $id): array
    {
        $payment = UnifiedPaymentEntry::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        if ($payment->payment_type !== 'fee') {
            throw new \InvalidArgumentException('Payment entry is not a fee collection');
        }

        $tenantUnit = $payment->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($payment->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($payment->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $payment->reference_number ?? 'FEE-' . $payment->id,
                'date' => $payment->transaction_date?->format('d M Y') ?? '',
                'status' => $payment->status ?? 'pending',
                'payment_method' => $payment->payment_method ? strtoupper(str_replace('_', ' ', $payment->payment_method)) : '',
            ],
            'amount' => [
                'total' => number_format((float) $payment->amount, 2),
                'currency' => $payment->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'payment' => [
                'type' => 'Fee',
                'description' => $payment->description ?? 'Fee collection',
                'reference_number' => $payment->reference_number ?? '',
            ],
        ];
    }

    /**
     * Prepare data for security deposit refund.
     */
    private function prepareSecurityDepositRefundData(int $id): array
    {
        $refund = SecurityDepositRefund::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        $tenantUnit = $refund->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($refund->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($refund->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Tenant',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $refund->refund_number ?? '',
                'receipt_number' => $refund->receipt_number ?? '',
                'date' => $refund->refund_date?->format('d M Y') ?? '',
                'status' => $refund->status ?? 'pending',
                'payment_method' => $refund->payment_method ? strtoupper(str_replace('_', ' ', $refund->payment_method)) : '',
                'transaction_reference' => $refund->transaction_reference ?? '',
            ],
            'amount' => [
                'original_deposit' => number_format((float) $refund->original_deposit, 2),
                'deductions' => number_format((float) $refund->deductions, 2),
                'total' => number_format((float) $refund->refund_amount, 2),
                'currency' => $currencySettings['primary'] ?? 'MVR',
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'deduction_reasons' => $refund->deduction_reasons ?? [],
        ];
    }

    /**
     * Prepare data for other income receipt.
     */
    private function prepareOtherIncomeReceiptData(int $id): array
    {
        $payment = UnifiedPaymentEntry::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        if ($payment->payment_type !== 'other_income') {
            throw new \InvalidArgumentException('Payment entry is not other income');
        }

        $tenantUnit = $payment->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($payment->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($payment->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Customer',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $payment->reference_number ?? 'OI-' . $payment->id,
                'date' => $payment->transaction_date?->format('d M Y') ?? '',
                'status' => $payment->status ?? 'pending',
                'payment_method' => $payment->payment_method ? strtoupper(str_replace('_', ' ', $payment->payment_method)) : '',
            ],
            'amount' => [
                'total' => number_format((float) $payment->amount, 2),
                'currency' => $payment->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'payment' => [
                'type' => 'Other Income',
                'description' => $payment->description ?? 'Other income collection',
                'reference_number' => $payment->reference_number ?? '',
            ],
        ];
    }

    /**
     * Prepare data for payment voucher (outgoing payments).
     */
    private function preparePaymentVoucherData(int $id): array
    {
        $payment = UnifiedPaymentEntry::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        if ($payment->flow_direction !== 'outgoing') {
            throw new \InvalidArgumentException('Payment entry is not an outgoing payment');
        }

        $tenantUnit = $payment->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($payment->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($payment->landlord_id);

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? 'Payee',
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $payment->reference_number ?? 'VOUCHER-' . $payment->id,
                'date' => $payment->transaction_date?->format('d M Y') ?? '',
                'status' => $payment->status ?? 'pending',
                'payment_method' => $payment->payment_method ? strtoupper(str_replace('_', ' ', $payment->payment_method)) : '',
            ],
            'amount' => [
                'total' => number_format((float) $payment->amount, 2),
                'currency' => $payment->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'payment' => [
                'type' => ucfirst(str_replace('_', ' ', $payment->payment_type)),
                'description' => $payment->description ?? 'Payment voucher',
                'reference_number' => $payment->reference_number ?? '',
            ],
        ];
    }

    /**
     * Prepare data for unified payment entry (generic).
     */
    private function prepareUnifiedPaymentEntryData(int $id): array
    {
        $payment = UnifiedPaymentEntry::with([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
            'landlord',
        ])->findOrFail($id);

        $tenantUnit = $payment->tenantUnit;
        $tenant = $tenantUnit?->tenant;
        $unit = $tenantUnit?->unit;
        $property = $unit?->property;

        $companySettings = $this->settingsService->getCompanySettings($payment->landlord_id);
        $currencySettings = $this->settingsService->getCurrencySettings($payment->landlord_id);

        $isReceipt = $payment->flow_direction === 'income';
        $documentType = $isReceipt ? 'Receipt' : 'Voucher';

        return [
            'company' => [
                'name' => $companySettings['name'] ?? 'Rental Management Suite',
                'address' => $companySettings['address'] ?? '',
                'phone' => $companySettings['phone'] ?? '',
                'email' => $companySettings['email'] ?? '',
            ],
            'customer' => [
                'name' => $tenant?->full_name ?? ($isReceipt ? 'Customer' : 'Payee'),
                'phone' => $tenant?->phone ?? '',
                'email' => $tenant?->email ?? '',
            ],
            'document' => [
                'number' => $payment->reference_number ?? ($documentType . '-' . $payment->id),
                'date' => $payment->transaction_date?->format('d M Y') ?? '',
                'status' => $payment->status ?? 'pending',
                'payment_method' => $payment->payment_method ? strtoupper(str_replace('_', ' ', $payment->payment_method)) : '',
                'type' => $documentType,
            ],
            'amount' => [
                'total' => number_format((float) $payment->amount, 2),
                'currency' => $payment->currency ?? ($currencySettings['primary'] ?? 'MVR'),
            ],
            'unit' => [
                'number' => $unit?->unit_number ?? '',
            ],
            'property' => [
                'name' => $property?->name ?? '',
            ],
            'payment' => [
                'type' => ucfirst(str_replace('_', ' ', $payment->payment_type)),
                'description' => $payment->description ?? ($isReceipt ? 'Payment receipt' : 'Payment voucher'),
                'reference_number' => $payment->reference_number ?? '',
                'flow_direction' => $payment->flow_direction,
            ],
        ];
    }
}

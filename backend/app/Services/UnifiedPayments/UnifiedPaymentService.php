<?php

namespace App\Services\UnifiedPayments;

use App\Models\FinancialRecord;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Models\UnifiedPaymentEntry;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class UnifiedPaymentService
{
    /**
     * @var array<string, array>
     */
    private const PAYMENT_TYPES = [
        'rent' => [
            'flow_direction' => 'income',
            'requires_tenant_unit' => true,
            'default_status' => 'pending',
        ],
        'maintenance_expense' => [
            'flow_direction' => 'outgoing',
            'requires_tenant_unit' => true,
            'default_status' => 'pending',
        ],
        'security_refund' => [
            'flow_direction' => 'outgoing',
            'requires_tenant_unit' => true,
            'default_status' => 'pending',
        ],
        'fee' => [
            'flow_direction' => 'income',
            'requires_tenant_unit' => true,
            'default_status' => 'pending',
        ],
        'other_income' => [
            'flow_direction' => 'income',
            'requires_tenant_unit' => false,
            'default_status' => 'pending',
        ],
        'other_outgoing' => [
            'flow_direction' => 'outgoing',
            'requires_tenant_unit' => false,
            'default_status' => 'pending',
        ],
    ];

    private const ALLOWED_STATUSES = [
        'draft',
        'pending',
        'scheduled',
        'completed',
        'partial',
        'cancelled',
        'failed',
        'refunded',
    ];

    public function create(array $payload, User $user): UnifiedPaymentEntry
    {
        $paymentType = Arr::get($payload, 'payment_type');

        $definition = self::PAYMENT_TYPES[$paymentType] ?? null;

        if (! $definition) {
            throw ValidationException::withMessages([
                'payment_type' => 'Unsupported payment type supplied.',
            ]);
        }

        if ($definition['requires_tenant_unit'] && empty($payload['tenant_unit_id'])) {
            throw ValidationException::withMessages([
                'tenant_unit_id' => 'A tenant/unit association is required for this payment type.',
            ]);
        }

        $tenantUnitId = Arr::get($payload, 'tenant_unit_id');

        if ($tenantUnitId) {
            $tenantUnit = TenantUnit::query()
                ->whereKey($tenantUnitId)
                ->where('landlord_id', $user->landlord_id)
                ->first();

            if (! $tenantUnit) {
                throw ValidationException::withMessages([
                    'tenant_unit_id' => 'The selected tenant/unit is invalid.',
                ]);
            }
        }

        $status = Arr::get($payload, 'status', $definition['default_status']);

        if (! in_array($status, self::ALLOWED_STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => 'Invalid payment status.',
            ]);
        }

        $amount = (float) Arr::get($payload, 'amount', 0);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Amount must be greater than 0.',
            ]);
        }

        $currency = strtoupper(Arr::get($payload, 'currency', 'USD'));

        if (strlen($currency) !== 3) {
            throw ValidationException::withMessages([
                'currency' => 'Currency must be a 3 character ISO code.',
            ]);
        }

        $transactionDate = Arr::get($payload, 'transaction_date');

        if ($transactionDate) {
            $transactionDate = Carbon::parse($transactionDate)->startOfDay();
        } elseif (in_array($status, ['completed', 'partial'], true)) {
            $transactionDate = Carbon::now()->startOfDay();
        }

        $dueDate = Arr::get($payload, 'due_date');

        if ($dueDate) {
            $dueDate = Carbon::parse($dueDate)->startOfDay();
        }

        $metadata = Arr::get($payload, 'metadata', []);

        // Extract source_type and source_id from payload or metadata
        $sourceType = Arr::get($payload, 'source_type') ?? Arr::get($metadata, 'source_type');
        $sourceId = Arr::get($payload, 'source_id') ?? Arr::get($metadata, 'source_id');

        $entry = new UnifiedPaymentEntry([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnitId,
            'payment_type' => $paymentType,
            'flow_direction' => $definition['flow_direction'],
            'amount' => $amount,
            'currency' => $currency,
            'description' => Arr::get($payload, 'description'),
            'transaction_date' => $transactionDate,
            'due_date' => $dueDate,
            'status' => $status,
            'payment_method' => Arr::get($payload, 'payment_method'),
            'reference_number' => Arr::get($payload, 'reference_number'),
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'metadata' => $metadata,
            'created_by' => $user->id,
            'captured_at' => Arr::get($payload, 'captured_at'),
            'voided_at' => Arr::get($payload, 'voided_at'),
        ]);

        if ($entry->status === 'completed' && ! $entry->captured_at) {
            $entry->captured_at = Carbon::now();
        }

        if ($entry->status === 'cancelled' && ! $entry->voided_at) {
            $entry->voided_at = Carbon::now();
        }

        $entry->save();

        // Update linked invoice/record status if payment is completed
        if (in_array($entry->status, ['completed', 'partial'], true)) {
            $this->updateLinkedSourceStatus($entry);
            // Create corresponding financial record if it doesn't exist
            $this->createFinancialRecordFromPayment($entry);
        }

        return $entry;
    }

    public function capture(UnifiedPaymentEntry $entry, array $payload): UnifiedPaymentEntry
    {
        if (in_array($entry->status, ['cancelled', 'failed', 'refunded'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Cannot capture a payment that has already been voided.',
            ]);
        }

        $status = Arr::get($payload, 'status', 'completed');

        if (! in_array($status, ['completed', 'partial'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Capture status must be completed or partial.',
            ]);
        }

        $transactionDate = Arr::get($payload, 'transaction_date');

        if ($transactionDate) {
            $entry->transaction_date = Carbon::parse($transactionDate)->startOfDay();
        } elseif (! $entry->transaction_date) {
            $entry->transaction_date = Carbon::now()->startOfDay();
        }

        $entry->status = $status;
        $entry->payment_method = Arr::get($payload, 'payment_method', $entry->payment_method);
        $entry->reference_number = Arr::get($payload, 'reference_number', $entry->reference_number);
        $entry->captured_at = Carbon::now();
        $entry->voided_at = null;
        $entry->metadata = $this->mergeMetadata($entry->metadata, Arr::get($payload, 'metadata'));

        $entry->save();

        // Update linked invoice/record status when payment is captured
        if (in_array($entry->status, ['completed', 'partial'], true)) {
            $this->updateLinkedSourceStatus($entry);
            // Create corresponding financial record if it doesn't exist
            $this->createFinancialRecordFromPayment($entry);
        }

        return $entry;
    }

    public function void(UnifiedPaymentEntry $entry, array $payload): UnifiedPaymentEntry
    {
        if (in_array($entry->status, ['cancelled', 'failed', 'refunded'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Payment has already been voided.',
            ]);
        }

        $status = Arr::get($payload, 'status', 'cancelled');

        if (! in_array($status, ['cancelled', 'failed', 'refunded'], true)) {
            throw ValidationException::withMessages([
                'status' => 'Invalid void status supplied.',
            ]);
        }

        $entry->status = $status;

        $voidedAt = Arr::get($payload, 'voided_at');

        $entry->voided_at = $voidedAt
            ? Carbon::parse($voidedAt)
            : Carbon::now();

        $metadata = Arr::get($payload, 'metadata');

        if ($reason = Arr::get($payload, 'reason')) {
            $metadata = $metadata ?? [];
            $metadata['void_reason'] = $reason;
        }

        $entry->metadata = $this->mergeMetadata($entry->metadata, $metadata);

        $entry->save();

        return $entry;
    }

    /**
     * Update the status of the linked source (rent invoice or financial record) when payment is completed.
     */
    private function updateLinkedSourceStatus(UnifiedPaymentEntry $entry): void
    {
        // Get source_type and source_id from entry fields or metadata
        $sourceType = $entry->source_type ?? Arr::get($entry->metadata, 'source_type');
        $sourceId = $entry->source_id ?? Arr::get($entry->metadata, 'source_id');

        if (! $sourceType || ! $sourceId) {
            return;
        }

        // Extract numeric ID if source_id is in format "type:id" (e.g., "rent_invoice:123")
        if (is_string($sourceId) && str_contains($sourceId, ':')) {
            [, $numericId] = explode(':', $sourceId, 2);
            $sourceId = (int) $numericId;
        } else {
            $sourceId = (int) $sourceId;
        }

        if ($sourceId <= 0) {
            return;
        }

        $isPartialPayment = $entry->status === 'partial' || Arr::get($entry->metadata, 'partial_payment', false);
        $paymentAmount = (float) $entry->amount;
        $paidDate = $entry->transaction_date ?? Carbon::now();

        if ($sourceType === 'rent_invoice') {
            $this->updateRentInvoiceStatus($sourceId, $entry->landlord_id, $paymentAmount, $paidDate, $isPartialPayment, $entry->payment_method);
        } elseif ($sourceType === 'financial_record') {
            $this->updateFinancialRecordStatus($sourceId, $entry->landlord_id, $paymentAmount, $paidDate, $isPartialPayment, $entry->payment_method);
        }
    }

    /**
     * Update rent invoice status after payment.
     */
    private function updateRentInvoiceStatus(int $invoiceId, int $landlordId, float $paymentAmount, Carbon $paidDate, bool $isPartial, ?string $paymentMethod): void
    {
        $invoice = RentInvoice::query()
            ->where('id', $invoiceId)
            ->where('landlord_id', $landlordId)
            ->first();

        if (! $invoice) {
            return;
        }

        $totalAmount = (float) $invoice->rent_amount + (float) ($invoice->late_fee ?? 0);
        $isFullyPaid = ! $isPartial && $paymentAmount >= $totalAmount - 0.01; // Allow small rounding differences

        if ($isFullyPaid) {
            $invoice->status = 'paid';
            $invoice->paid_date = $paidDate;
            if ($paymentMethod) {
                $invoice->payment_method = $paymentMethod;
            }
            $invoice->save();
        } elseif ($isPartial) {
            // For partial payments, we keep the invoice as 'sent' or 'overdue' but record the partial payment
            // The invoice will remain in pending charges until fully paid
            // You could also track partial payments in a separate table if needed
        }
    }

    /**
     * Update financial record status after payment.
     */
    private function updateFinancialRecordStatus(int $recordId, int $landlordId, float $paymentAmount, Carbon $paidDate, bool $isPartial, ?string $paymentMethod): void
    {
        $record = FinancialRecord::query()
            ->where('id', $recordId)
            ->where('landlord_id', $landlordId)
            ->first();

        if (! $record) {
            return;
        }

        $totalAmount = (float) $record->amount;
        $isFullyPaid = ! $isPartial && $paymentAmount >= $totalAmount - 0.01; // Allow small rounding differences

        if ($isFullyPaid) {
            $record->status = 'completed';
            $record->paid_date = $paidDate;
            if ($paymentMethod) {
                $record->payment_method = $paymentMethod;
            }
            $record->save();
        } elseif ($isPartial) {
            $record->status = 'partial';
            if (! $record->paid_date) {
                $record->paid_date = $paidDate;
            }
            if ($paymentMethod) {
                $record->payment_method = $paymentMethod;
            }
            $record->save();
        }
    }

    /**
     * Create a financial record from a unified payment entry to keep both systems synchronized.
     */
    private function createFinancialRecordFromPayment(UnifiedPaymentEntry $entry): void
    {
        // Skip if payment doesn't require a tenant unit (can't create financial record without it)
        if (! $entry->tenant_unit_id) {
            return;
        }

        // Skip if a financial record already exists for this payment (via source_id)
        if ($entry->source_type === 'financial_record' && $entry->source_id) {
            return;
        }

        // Skip if payment is linked to a rent invoice (rent invoices are separate from financial records)
        if ($entry->source_type === 'rent_invoice') {
            return;
        }

        // Map payment type to financial record type and category
        $mapping = $this->mapPaymentTypeToFinancialRecord($entry->payment_type, $entry->metadata);

        if (! $mapping) {
            return; // Payment type doesn't map to a financial record
        }

        // Check if financial record already exists for this unified payment entry
        $existingRecord = FinancialRecord::query()
            ->where('landlord_id', $entry->landlord_id)
            ->where('tenant_unit_id', $entry->tenant_unit_id)
            ->where('type', $mapping['type'])
            ->where('category', $mapping['category'])
            ->where('amount', $entry->amount)
            ->where('transaction_date', $entry->transaction_date)
            ->where('reference_number', $entry->reference_number)
            ->first();

        if ($existingRecord) {
            return; // Financial record already exists
        }

        // Determine status based on payment status
        $status = match ($entry->status) {
            'completed' => 'completed',
            'partial' => 'partial',
            default => 'pending',
        };

        FinancialRecord::create([
            'landlord_id' => $entry->landlord_id,
            'tenant_unit_id' => $entry->tenant_unit_id,
            'type' => $mapping['type'],
            'category' => $mapping['category'],
            'amount' => $entry->amount,
            'description' => $entry->description ?? $this->generateDescriptionFromPayment($entry),
            'due_date' => $entry->due_date,
            'paid_date' => $status === 'completed' ? ($entry->transaction_date ?? Carbon::now()) : null,
            'transaction_date' => $entry->transaction_date ?? Carbon::now(),
            'invoice_number' => Arr::get($entry->metadata, 'invoice_number'),
            'payment_method' => $entry->payment_method,
            'reference_number' => $entry->reference_number,
            'status' => $status,
        ]);
    }

    /**
     * Map unified payment type to financial record type and category.
     *
     * @return array{type: string, category: string}|null
     */
    private function mapPaymentTypeToFinancialRecord(string $paymentType, ?array $metadata): ?array
    {
        return match ($paymentType) {
            'rent' => [
                'type' => 'rent',
                'category' => 'monthly_rent',
            ],
            'fee' => [
                'type' => 'fee',
                'category' => $this->determineFeeCategory($metadata),
            ],
            'maintenance_expense' => [
                'type' => 'expense',
                'category' => 'maintenance',
            ],
            'other_income' => [
                'type' => $this->determineOtherIncomeType($metadata),
                'category' => $this->determineOtherIncomeCategory($metadata),
            ],
            'other_outgoing' => [
                'type' => 'expense',
                'category' => $this->determineOtherOutgoingCategory($metadata),
            ],
            'security_refund' => null, // Handled by SecurityDepositRefund model
            default => null,
        };
    }

    /**
     * Determine fee category from metadata or default to late_fee.
     */
    private function determineFeeCategory(?array $metadata): string
    {
        $category = Arr::get($metadata, 'category');
        
        if (in_array($category, ['late_fee', 'processing_fee'], true)) {
            return $category;
        }

        return 'late_fee'; // Default
    }

    /**
     * Determine type for other_income payments.
     */
    private function determineOtherIncomeType(?array $metadata): string
    {
        $category = Arr::get($metadata, 'category');
        
        // If it's a fee-related category, use 'fee', otherwise 'rent'
        if (in_array($category, ['late_fee', 'processing_fee'], true)) {
            return 'fee';
        }

        return 'rent'; // Default to rent for other income
    }

    /**
     * Determine category for other_income payments.
     */
    private function determineOtherIncomeCategory(?array $metadata): string
    {
        $category = Arr::get($metadata, 'category');
        
        $validCategories = [
            'monthly_rent', 'late_fee', 'processing_fee',
            'utility', 'tax', 'insurance', 'management_fee', 'other',
        ];

        if (in_array($category, $validCategories, true)) {
            return $category;
        }

        return 'other'; // Default
    }

    /**
     * Determine category for other_outgoing payments.
     */
    private function determineOtherOutgoingCategory(?array $metadata): string
    {
        $category = Arr::get($metadata, 'category');
        
        $validCategories = [
            'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other',
        ];

        if (in_array($category, $validCategories, true)) {
            return $category;
        }

        return 'other'; // Default
    }

    /**
     * Generate a description for the financial record if none is provided.
     */
    private function generateDescriptionFromPayment(UnifiedPaymentEntry $entry): string
    {
        $paymentTypeLabel = match ($entry->payment_type) {
            'rent' => 'Rent Payment',
            'fee' => 'Fee Payment',
            'maintenance_expense' => 'Maintenance Expense',
            'other_income' => 'Other Income',
            'other_outgoing' => 'Other Outgoing',
            default => 'Payment',
        };

        return sprintf('%s - %s', $paymentTypeLabel, $entry->reference_number ?? 'No reference');
    }

    /**
     * @param array<string, mixed>|null $existing
     * @param array<string, mixed>|null $incoming
     */
    private function mergeMetadata(?array $existing, ?array $incoming): ?array
    {
        if (empty($incoming)) {
            return $existing;
        }

        if (empty($existing)) {
            return $incoming;
        }

        return array_replace_recursive($existing, $incoming);
    }
}



<?php

namespace App\Services\UnifiedPayments;

use App\Helpers\PaymentMethodNormalizer;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
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
        // Log the incoming request for debugging
        \Log::info('Creating unified payment entry', [
            'user_id' => $user->id ?? 'missing',
            'landlord_id' => $user->landlord_id ?? 'missing',
            'payload_keys' => array_keys($payload),
            'source_type' => $payload['source_type'] ?? 'not set',
            'source_id' => $payload['source_id'] ?? 'not set',
            'payment_type' => $payload['payment_type'] ?? 'not set',
        ]);

        // Validate user has required fields
        if (! $user->id) {
            throw ValidationException::withMessages([
                'user' => 'User ID is missing. Please log in again.',
            ]);
        }

        if (! $user->landlord_id) {
            throw ValidationException::withMessages([
                'user' => 'User is not associated with a landlord.',
            ]);
        }

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

        $currency = strtoupper(Arr::get($payload, 'currency', 'MVR'));

        // Safeguard: Always use MVR if AED is provided (legacy support)
        if ($currency === 'AED') {
            $currency = 'MVR';
        }

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
        
        // Ensure metadata is an array (not object) for JSON storage
        if (! is_array($metadata)) {
            $metadata = [];
        }

        // Extract source_type and source_id from payload or metadata
        // Priority: payload fields > metadata fields
        $sourceType = Arr::get($payload, 'source_type');
        if (!$sourceType || $sourceType === 'null' || $sourceType === '') {
            $sourceType = Arr::get($metadata, 'source_type');
        }
        // Normalize: convert to null if empty string
        if ($sourceType === '' || $sourceType === 'null') {
            $sourceType = null;
        }
        
        $sourceId = Arr::get($payload, 'source_id');
        if (!$sourceId || $sourceId === 'null' || $sourceId === '') {
            $sourceId = Arr::get($metadata, 'source_id');
        }
        
        // Convert source_id to integer if it's a string with format "type:id"
        if ($sourceId && is_string($sourceId)) {
            if (str_contains($sourceId, ':')) {
                [, $numericId] = explode(':', $sourceId, 2);
                $sourceId = (int) $numericId;
            } elseif ($sourceId !== '' && $sourceId !== 'null') {
                $sourceId = (int) $sourceId;
            } else {
                $sourceId = null;
            }
        } elseif ($sourceId) {
            $sourceId = (int) $sourceId;
        } else {
            $sourceId = null;
        }
        
        // If sourceId is 0 or negative, set to null
        if ($sourceId <= 0) {
            $sourceId = null;
        }

        // Validate that linked invoice is not already paid (if linked to a rent invoice)
        if ($sourceType === 'rent_invoice' && $sourceId) {
            // Extract numeric ID if source_id is in format "type:id" (e.g., "rent_invoice:123")
            $numericId = is_string($sourceId) && str_contains($sourceId, ':')
                ? (int) explode(':', $sourceId, 2)[1]
                : (int) $sourceId;

            if ($numericId > 0) {
                $invoice = RentInvoice::query()
                    ->where('id', $numericId)
                    ->where('landlord_id', $user->landlord_id)
                    ->first();

                if ($invoice && $invoice->status === 'paid') {
                    throw ValidationException::withMessages([
                        'source_id' => 'This invoice has already been paid and cannot receive additional payments.',
                    ]);
                }
            }
        }

        // Payment method is stored as-is (string) - no normalization needed
        // unified_payment_entries.payment_method is VARCHAR, so it can store payment method names directly
        $paymentMethod = Arr::get($payload, 'payment_method');

        // Log source_type and source_id before creating entry
        \Log::info('Creating UnifiedPaymentEntry with source info', [
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'source_id_type' => gettype($sourceId),
            'source_type_from_payload' => Arr::get($payload, 'source_type'),
            'source_id_from_payload' => Arr::get($payload, 'source_id'),
            'source_id_from_payload_type' => gettype(Arr::get($payload, 'source_id')),
            'metadata_source_type' => Arr::get($metadata, 'source_type'),
            'metadata_source_id' => Arr::get($metadata, 'source_id'),
            'metadata_source_id_type' => gettype(Arr::get($metadata, 'source_id')),
            'payment_type' => $paymentType,
            'status' => $status,
            'full_payload_keys' => array_keys($payload),
            'metadata_keys' => array_keys($metadata),
        ]);

        $entry = new UnifiedPaymentEntry([
            'landlord_id' => $user->landlord_id,
            'tenant_unit_id' => $tenantUnitId,
            'payment_type' => $paymentType,
            'flow_direction' => $definition['flow_direction'],
            'amount' => $amount,
            'currency' => $currency,
            'description' => Arr::get($payload, 'description') ? substr(Arr::get($payload, 'description'), 0, 65535) : null,
            'transaction_date' => $transactionDate,
            'due_date' => $dueDate,
            'status' => $status,
            'payment_method' => $paymentMethod,
            'reference_number' => Arr::get($payload, 'reference_number'),
            'source_type' => $sourceType ?: null,
            'source_id' => $sourceId ?: null,
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

        // Log entry data before saving
        \Log::info('Attempting to save unified payment entry', [
            'entry_attributes' => $entry->getAttributes(),
            'entry_dirty' => $entry->getDirty(),
        ]);

        try {
            $entry->save();
            
            // Refresh the entry to ensure we have the latest data from database
            $entry->refresh();
            
            \Log::info('Successfully saved unified payment entry', [
                'entry_id' => $entry->id,
                'source_type' => $entry->source_type,
                'source_id' => $entry->source_id,
                'source_id_type' => gettype($entry->source_id),
                'status' => $entry->status,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Failed to save unified payment entry - QueryException', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'code' => $e->getCode(),
                'entry_data' => $entry->getAttributes(),
                'entry_dirty' => $entry->getDirty(),
            ]);
            
            // Re-throw as QueryException so the exception handler can catch it properly
            // This ensures the detailed error is shown
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Unexpected error saving unified payment entry', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'entry_data' => $entry->getAttributes(),
            ]);
            throw $e;
        }

        // Update linked invoice/record status if payment is completed
        if (in_array($entry->status, ['completed', 'partial'], true)) {
            \Log::info('Payment is completed/partial, attempting to update linked source', [
                'entry_id' => $entry->id,
                'entry_status' => $entry->status,
                'source_type' => $entry->source_type,
                'source_id' => $entry->source_id,
            ]);
            
            try {
                // First try to update using source_type/source_id if available
                if ($entry->source_type && $entry->source_id) {
                    $this->updateLinkedSourceStatus($entry);
                } else {
                    // If source_type/source_id weren't set, try to auto-link based on description
                    \Log::info('source_type/source_id not set, attempting auto-link by description');
                    $this->autoLinkInvoiceByDescription($entry);
                    
                    // After auto-linking, refresh and try to update again if it was linked
                    $entry->refresh();
                    if ($entry->source_type && $entry->source_id) {
                        \Log::info('Auto-link succeeded, attempting to update linked source again');
                        $this->updateLinkedSourceStatus($entry);
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Failed to update linked source status', [
                    'entry_id' => $entry->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Don't fail the entire operation if this fails
            }

            // NOTE: Financial record creation is completely removed
            // The unified payment entry is the source of truth
            // Financial records are legacy and should not be created from unified payments
            // If financial records are needed, they should be created through their own dedicated endpoints
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
        
        // Payment method is stored as-is (string) - no normalization needed
        $entry->payment_method = Arr::get($payload, 'payment_method', $entry->payment_method);
        
        $entry->reference_number = Arr::get($payload, 'reference_number', $entry->reference_number);
        $entry->captured_at = Carbon::now();
        $entry->voided_at = null;
        $entry->metadata = $this->mergeMetadata($entry->metadata, Arr::get($payload, 'metadata'));

        $entry->save();

        // Update linked invoice/record status when payment is captured
        if (in_array($entry->status, ['completed', 'partial'], true)) {
            $this->updateLinkedSourceStatus($entry);
            // NOTE: Financial record creation disabled - unified payment entry is source of truth
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

        \Log::info('updateLinkedSourceStatus called', [
            'entry_id' => $entry->id,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'source_id_type' => gettype($sourceId),
            'entry_source_type' => $entry->source_type,
            'entry_source_id' => $entry->source_id,
            'entry_source_id_type' => gettype($entry->source_id),
            'metadata' => $entry->metadata,
            'entry_status' => $entry->status,
        ]);

        if (! $sourceType || ! $sourceId) {
            \Log::warning('updateLinkedSourceStatus: Missing source_type or source_id', [
                'entry_id' => $entry->id,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'entry_source_type' => $entry->source_type,
                'entry_source_id' => $entry->source_id,
                'metadata_source_type' => Arr::get($entry->metadata, 'source_type'),
                'metadata_source_id' => Arr::get($entry->metadata, 'source_id'),
            ]);
            return;
        }

        // Extract numeric ID if source_id is in format "type:id" (e.g., "rent_invoice:123")
        $originalSourceId = $sourceId;
        if (is_string($sourceId) && str_contains($sourceId, ':')) {
            [, $numericId] = explode(':', $sourceId, 2);
            $sourceId = (int) $numericId;
        } elseif (is_string($sourceId)) {
            // Try to convert string to int
            $sourceId = (int) $sourceId;
        } else {
            $sourceId = (int) $sourceId;
        }

        \Log::info('Processing source_id in updateLinkedSourceStatus', [
            'original_source_id' => $originalSourceId,
            'original_type' => gettype($originalSourceId),
            'processed_source_id' => $sourceId,
            'processed_type' => gettype($sourceId),
            'source_type' => $sourceType,
        ]);

        if ($sourceId <= 0) {
            \Log::warning('Invalid source_id in updateLinkedSourceStatus', [
                'original_source_id' => $originalSourceId,
                'processed_source_id' => $sourceId,
                'source_type' => $sourceType,
            ]);
            return;
        }

        $isPartialPayment = $entry->status === 'partial' || Arr::get($entry->metadata, 'partial_payment', false);
        $paymentAmount = (float) $entry->amount;
        $paidDate = $entry->transaction_date ?? Carbon::now();

        if ($sourceType === 'rent_invoice') {
            $this->updateRentInvoiceStatus($sourceId, $entry->landlord_id, $paymentAmount, $paidDate, $isPartialPayment, $entry->payment_method);
        } elseif ($sourceType === 'financial_record') {
            $this->updateFinancialRecordStatus($sourceId, $entry->landlord_id, $paymentAmount, $paidDate, $isPartialPayment, $entry->payment_method);
        } elseif ($sourceType === 'maintenance_invoice') {
            \Log::info('Calling updateMaintenanceInvoiceStatus', [
                'invoice_id' => $sourceId,
                'landlord_id' => $entry->landlord_id,
                'payment_amount' => $paymentAmount,
                'is_partial' => $isPartialPayment,
            ]);
            $this->updateMaintenanceInvoiceStatus($sourceId, $entry->landlord_id, $paymentAmount, $paidDate, $isPartialPayment, $entry->payment_method);
        } else {
            \Log::warning('updateLinkedSourceStatus: Unknown source_type', [
                'entry_id' => $entry->id,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
            ]);
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
        
        // Check if invoice is already paid - if so, don't update again
        if ($invoice->status === 'paid') {
            \Log::info('Invoice is already paid, skipping status update', [
                'invoice_id' => $invoiceId,
                'current_status' => $invoice->status,
            ]);
            return;
        }
        
        $isFullyPaid = ! $isPartial && $paymentAmount >= $totalAmount - 0.01; // Allow small rounding differences

        \Log::info('Updating invoice status after payment', [
            'invoice_id' => $invoiceId,
            'invoice_status' => $invoice->status,
            'payment_amount' => $paymentAmount,
            'total_amount' => $totalAmount,
            'is_partial' => $isPartial,
            'is_fully_paid' => $isFullyPaid,
        ]);

        if ($isFullyPaid) {
            $invoice->status = 'paid';
            $invoice->paid_date = $paidDate;
            if ($paymentMethod) {
                // Payment method is stored as-is - rent_invoices.payment_method is ENUM but will be updated separately
                // For now, we still normalize for rent_invoices since it uses ENUM
                $invoice->payment_method = PaymentMethodNormalizer::normalize($paymentMethod);
            }
            $invoice->save();
            
            \Log::info('Invoice status updated to paid', [
                'invoice_id' => $invoiceId,
                'new_status' => $invoice->status,
                'paid_date' => $invoice->paid_date,
            ]);
            
            // Reload invoice to verify it was saved correctly
            $invoice->refresh();
            if ($invoice->status !== 'paid') {
                \Log::error('Invoice status was not saved correctly', [
                    'invoice_id' => $invoiceId,
                    'expected_status' => 'paid',
                    'actual_status' => $invoice->status,
                ]);
            }
        } elseif ($isPartial) {
            // For partial payments, we keep the invoice as 'sent' or 'overdue' but record the partial payment
            // The invoice will remain in pending charges until fully paid
            // You could also track partial payments in a separate table if needed
            \Log::info('Partial payment received, invoice status remains unchanged', [
                'invoice_id' => $invoiceId,
                'payment_amount' => $paymentAmount,
                'total_amount' => $totalAmount,
                'remaining' => $totalAmount - $paymentAmount,
            ]);
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

        // Payment method is stored as-is - financial_records now uses VARCHAR referencing payment_methods.name
        // No normalization needed
        
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

        // If this financial record is linked to a maintenance invoice, update the invoice status too
        if ($record->type === 'fee' && $record->category === 'maintenance' && $record->invoice_number) {
            $this->updateMaintenanceInvoiceByInvoiceNumber(
                $record->invoice_number,
                $landlordId,
                $paymentAmount,
                $paidDate,
                $isPartial,
                $paymentMethod
            );
        }
    }

    /**
     * Update maintenance invoice status after payment.
     */
    private function updateMaintenanceInvoiceStatus(int $invoiceId, int $landlordId, float $paymentAmount, Carbon $paidDate, bool $isPartial, ?string $paymentMethod): void
    {
        // Use withoutGlobalScopes to bypass the landlord scope since we're updating from a service context
        $invoice = MaintenanceInvoice::withoutGlobalScopes()
            ->where('id', $invoiceId)
            ->where('landlord_id', $landlordId)
            ->first();

        if (! $invoice) {
            \Log::warning('Maintenance invoice not found', [
                'invoice_id' => $invoiceId,
                'landlord_id' => $landlordId,
            ]);
            return;
        }
        
        \Log::info('Maintenance invoice found', [
            'invoice_id' => $invoiceId,
            'invoice_number' => $invoice->invoice_number,
            'current_status' => $invoice->status,
            'grand_total' => $invoice->grand_total,
        ]);

        $totalAmount = (float) $invoice->grand_total;
        
        // Check if invoice is already paid - if so, don't update again
        if ($invoice->status === 'paid') {
            \Log::info('Maintenance invoice is already paid, skipping status update', [
                'invoice_id' => $invoiceId,
                'current_status' => $invoice->status,
            ]);
            return;
        }
        
        $isFullyPaid = ! $isPartial && $paymentAmount >= $totalAmount - 0.01; // Allow small rounding differences

        \Log::info('Updating maintenance invoice status after payment', [
            'invoice_id' => $invoiceId,
            'invoice_status' => $invoice->status,
            'payment_amount' => $paymentAmount,
            'total_amount' => $totalAmount,
            'is_partial' => $isPartial,
            'is_fully_paid' => $isFullyPaid,
        ]);

        if ($isFullyPaid) {
            \Log::info('Attempting to update maintenance invoice to paid', [
                'invoice_id' => $invoiceId,
                'landlord_id' => $landlordId,
                'current_status' => $invoice->status,
                'payment_amount' => $paymentAmount,
                'grand_total' => $totalAmount,
            ]);
            
            // Update the invoice - try using the model instance first, then fall back to update()
            // This ensures model events fire but we bypass global scopes
            $invoiceToUpdate = MaintenanceInvoice::withoutGlobalScopes()
                ->where('id', $invoiceId)
                ->where('landlord_id', $landlordId)
                ->first();
            
            if (!$invoiceToUpdate) {
                \Log::error('Cannot find invoice to update', [
                    'invoice_id' => $invoiceId,
                    'landlord_id' => $landlordId,
                ]);
                return;
            }
            
            $invoiceToUpdate->status = 'paid';
            $invoiceToUpdate->paid_date = $paidDate;
            if ($paymentMethod) {
                $invoiceToUpdate->payment_method = $paymentMethod;
            }
            
            try {
                $invoiceToUpdate->save();
                $updated = 1;
            } catch (\Exception $e) {
                \Log::error('Failed to save maintenance invoice', [
                    'invoice_id' => $invoiceId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Try direct update as fallback
                $updated = MaintenanceInvoice::withoutGlobalScopes()
                    ->where('id', $invoiceId)
                    ->where('landlord_id', $landlordId)
                    ->update([
                        'status' => 'paid',
                        'paid_date' => $paidDate,
                    ]);
            }
            
            \Log::info('Maintenance invoice status update attempted', [
                'invoice_id' => $invoiceId,
                'rows_updated' => $updated,
                'paid_date' => $paidDate,
                'payment_method' => $paymentMethod,
            ]);
            
            if ($updated === 0) {
                \Log::error('Maintenance invoice update returned 0 rows - invoice may not exist or landlord_id mismatch', [
                    'invoice_id' => $invoiceId,
                    'landlord_id' => $landlordId,
                    'invoice_exists' => MaintenanceInvoice::withoutGlobalScopes()->where('id', $invoiceId)->exists(),
                    'invoice_landlord_id' => MaintenanceInvoice::withoutGlobalScopes()->where('id', $invoiceId)->value('landlord_id'),
                ]);
            }
            
            // Reload invoice to verify it was saved correctly
            $invoice = MaintenanceInvoice::withoutGlobalScopes()
                ->where('id', $invoiceId)
                ->where('landlord_id', $landlordId)
                ->first();
                
            if ($invoice && $invoice->status === 'paid') {
                \Log::info('Maintenance invoice status verified as paid', [
                    'invoice_id' => $invoiceId,
                    'status' => $invoice->status,
                    'paid_date' => $invoice->paid_date,
                ]);
            } else {
                \Log::error('Maintenance invoice status was not saved correctly', [
                    'invoice_id' => $invoiceId,
                    'expected_status' => 'paid',
                    'actual_status' => $invoice?->status ?? 'not found',
                    'rows_updated' => $updated,
                    'invoice_found' => $invoice !== null,
                ]);
            }
        } elseif ($isPartial) {
            // For partial payments, we keep the invoice as 'sent' or 'overdue' but record the partial payment
            // The invoice will remain in pending charges until fully paid
            \Log::info('Partial payment received for maintenance invoice, status remains unchanged', [
                'invoice_id' => $invoiceId,
                'payment_amount' => $paymentAmount,
                'total_amount' => $totalAmount,
                'remaining' => $totalAmount - $paymentAmount,
            ]);
        }
    }

    /**
     * Update maintenance invoice status by invoice number (used when financial record is updated).
     */
    private function updateMaintenanceInvoiceByInvoiceNumber(string $invoiceNumber, int $landlordId, float $paymentAmount, Carbon $paidDate, bool $isPartial, ?string $paymentMethod): void
    {
        // Use withoutGlobalScopes to bypass the landlord scope since we're updating from a service context
        $invoice = MaintenanceInvoice::withoutGlobalScopes()
            ->where('invoice_number', $invoiceNumber)
            ->where('landlord_id', $landlordId)
            ->first();

        if (! $invoice) {
            return;
        }

        $totalAmount = (float) $invoice->grand_total;
        
        // Check if invoice is already paid - if so, don't update again
        if ($invoice->status === 'paid') {
            return;
        }
        
        $isFullyPaid = ! $isPartial && $paymentAmount >= $totalAmount - 0.01; // Allow small rounding differences

        if ($isFullyPaid) {
            // Update the invoice using model instance to ensure proper saving
            $invoiceToUpdate = MaintenanceInvoice::withoutGlobalScopes()
                ->where('invoice_number', $invoiceNumber)
                ->where('landlord_id', $landlordId)
                ->first();
            
            if (!$invoiceToUpdate) {
                \Log::error('Cannot find invoice to update by invoice number', [
                    'invoice_number' => $invoiceNumber,
                    'landlord_id' => $landlordId,
                ]);
                return;
            }
            
            $invoiceToUpdate->status = 'paid';
            $invoiceToUpdate->paid_date = $paidDate;
            if ($paymentMethod) {
                $invoiceToUpdate->payment_method = $paymentMethod;
            }
            
            try {
                $invoiceToUpdate->save();
                $updated = 1;
            } catch (\Exception $e) {
                \Log::error('Failed to save maintenance invoice by invoice number', [
                    'invoice_number' => $invoiceNumber,
                    'error' => $e->getMessage(),
                ]);
                // Try direct update as fallback
                $updated = MaintenanceInvoice::withoutGlobalScopes()
                    ->where('invoice_number', $invoiceNumber)
                    ->where('landlord_id', $landlordId)
                    ->update([
                        'status' => 'paid',
                        'paid_date' => $paidDate,
                    ]);
            }
            
            \Log::info('Maintenance invoice status update attempted via financial record', [
                'invoice_number' => $invoiceNumber,
                'rows_updated' => $updated,
                'paid_date' => $paidDate,
                'payment_method' => $paymentMethod,
            ]);
            
            // Reload invoice to verify
            $invoice = MaintenanceInvoice::withoutGlobalScopes()
                ->where('invoice_number', $invoiceNumber)
                ->where('landlord_id', $landlordId)
                ->first();
                
            if ($invoice && $invoice->status === 'paid') {
                \Log::info('Maintenance invoice status verified as paid via financial record', [
                    'invoice_number' => $invoiceNumber,
                    'invoice_id' => $invoice->id,
                    'status' => $invoice->status,
                    'paid_date' => $invoice->paid_date,
                ]);
            }
        } elseif ($isPartial) {
            \Log::info('Partial payment received for maintenance invoice via financial record', [
                'invoice_number' => $invoiceNumber,
                'invoice_id' => $invoice->id,
                'payment_amount' => $paymentAmount,
                'total_amount' => $totalAmount,
                'remaining' => $totalAmount - $paymentAmount,
            ]);
        }
    }

    /**
     * Auto-link invoice by description if source_type/source_id weren't provided.
     * This is a fallback mechanism when payments are created without explicit linking.
     */
    private function autoLinkInvoiceByDescription(UnifiedPaymentEntry $entry): void
    {
        if (!$entry->tenant_unit_id || !$entry->description) {
            return;
        }

        // Try to extract invoice number from description
        // Common patterns: "Invoice RINV-202511-003" or "RINV-202511-003"
        $description = $entry->description;
        $invoiceNumber = null;

        // Try to find invoice number pattern (e.g., RINV-YYYY-MM-XXX)
        if (preg_match('/\bRINV-\d{4}\d{2}-\d{3,}\b/', $description, $matches)) {
            $invoiceNumber = $matches[0];
        } elseif (preg_match('/Invoice\s+([A-Z0-9-]+)/i', $description, $matches)) {
            $invoiceNumber = trim($matches[1]);
        }

        if (!$invoiceNumber) {
            return;
        }

        // Find invoice by invoice number
        $invoice = RentInvoice::query()
            ->where('landlord_id', $entry->landlord_id)
            ->where('tenant_unit_id', $entry->tenant_unit_id)
            ->where('invoice_number', $invoiceNumber)
            ->whereIn('status', ['generated', 'sent', 'overdue'])
            ->first();

        if (!$invoice) {
            return;
        }

        // Update the entry with source info
        $entry->source_type = 'rent_invoice';
        $entry->source_id = $invoice->id;
        $entry->save();

        // Now update the invoice status
        $isPartialPayment = $entry->status === 'partial' || Arr::get($entry->metadata, 'partial_payment', false);
        $paymentAmount = (float) $entry->amount;
        $paidDate = $entry->transaction_date ?? Carbon::now();

        $this->updateRentInvoiceStatus(
            $invoice->id,
            $entry->landlord_id,
            $paymentAmount,
            $paidDate,
            $isPartialPayment,
            $entry->payment_method
        );

        \Log::info('Auto-linked invoice by description', [
            'entry_id' => $entry->id,
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoiceNumber,
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



<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\UnifiedPayment */
class UnifiedPaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'composite_id' => $this->composite_id,
            'landlord_id' => $this->landlord_id,
            'tenant_unit_id' => $this->tenant_unit_id,
            'unit_id' => $this->unit_id,
            'payment_type' => $this->payment_type,
            'flow_direction' => $this->flow_direction,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'description' => $this->description,
            'transaction_date' => $this->transaction_date ? $this->transaction_date->toDateString() : null,
            'due_date' => $this->due_date ? $this->due_date->toDateString() : null,
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'invoice_number' => $this->invoice_number,
            'tenant_name' => $this->tenant_name,
            'vendor_name' => $this->vendor_name,
            'metadata' => $this->metadata,
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            'entry_origin' => $this->entry_origin,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'captured_at' => $this->captured_at?->toISOString(),
            'voided_at' => $this->voided_at?->toISOString(),
        ];
    }
}


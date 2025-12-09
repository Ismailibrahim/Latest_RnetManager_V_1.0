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
        // For views, access attributes directly via the model
        // The view columns should be accessible as regular attributes
        $propertyName = $this->resource->property_name ?? null;
        $unitNumber = $this->resource->unit_number ?? null;
        
        // Fallback: If view columns are null but unit_id exists, fetch from relationships
        if (($propertyName === null || $unitNumber === null) && $this->resource->unit_id) {
            try {
                $unit = \App\Models\Unit::with('property')->find($this->resource->unit_id);
                if ($unit) {
                    if ($unitNumber === null) {
                        $unitNumber = $unit->unit_number;
                    }
                    if ($propertyName === null && $unit->property) {
                        $propertyName = $unit->property->name;
                    }
                }
            } catch (\Exception $e) {
                // Silently fail
            }
        }
        
        // Another fallback: If still null, try via tenant_unit_id
        if (($propertyName === null || $unitNumber === null) && $this->resource->tenant_unit_id) {
            try {
                $tenantUnit = \App\Models\TenantUnit::with(['unit.property'])->find($this->resource->tenant_unit_id);
                if ($tenantUnit && $tenantUnit->unit) {
                    if ($unitNumber === null) {
                        $unitNumber = $tenantUnit->unit->unit_number;
                    }
                    if ($propertyName === null && $tenantUnit->unit->property) {
                        $propertyName = $tenantUnit->unit->property->name;
                    }
                }
            } catch (\Exception $e) {
                // Silently fail
            }
        }

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
            'property_name' => $propertyName,
            'unit_number' => $unitNumber,
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


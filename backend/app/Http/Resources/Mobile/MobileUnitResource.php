<?php

namespace App\Http\Resources\Mobile;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Unit */
class MobileUnitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Includes aggregated data for mobile: invoice counts, tenant info, status.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Get dynamically set attributes
        $tenantUnit = $this->resource->getAttribute('current_tenant_unit');
        $isOccupied = $this->resource->getAttribute('is_occupied') ?? $this->is_occupied;
        $pendingCount = $this->resource->getAttribute('pending_invoices_count') ?? 0;
        $unpaidCount = $this->resource->getAttribute('unpaid_invoices_count') ?? 0;

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'unit_number' => $this->unit_number,
            'rent_amount' => (float) $this->rent_amount,
            'security_deposit' => $this->security_deposit !== null ? (float) $this->security_deposit : null,
            
            // Unit status
            'status' => $isOccupied ? 'occupied' : 'vacant',
            'is_occupied' => (bool) $isOccupied,
            
            // Aggregated invoice counts
            'pending_invoices_count' => (int) $pendingCount,
            'unpaid_invoices_count' => (int) $unpaidCount,
            
            // Current tenant (if occupied)
            'current_tenant' => $this->when($tenantUnit && $tenantUnit->relationLoaded('tenant'), function () use ($tenantUnit) {
                return [
                    'id' => $tenantUnit->tenant->id,
                    'full_name' => $tenantUnit->tenant->full_name,
                    'email' => $tenantUnit->tenant->email,
                    'phone' => $tenantUnit->tenant->phone,
                ];
            }),
            
            // Property info
            'property' => $this->whenLoaded('property', fn () => [
                'id' => $this->property->id,
                'name' => $this->property->name,
            ]),
            
            // Unit type
            'unit_type' => $this->whenLoaded('unitType', fn () => [
                'id' => $this->unitType->id,
                'name' => $this->unitType->name,
            ]),
        ];
    }
}


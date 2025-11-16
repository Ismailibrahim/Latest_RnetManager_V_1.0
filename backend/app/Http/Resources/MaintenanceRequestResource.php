<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\MaintenanceRequest */
class MaintenanceRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unit_id' => $this->unit_id,
            'landlord_id' => $this->landlord_id,
            'description' => $this->description,
            'cost' => (float) $this->cost,
            'asset_id' => $this->asset_id,
            'location' => $this->location,
            'serviced_by' => $this->serviced_by,
            'invoice_number' => $this->invoice_number,
            'is_billable' => (bool) $this->is_billable,
            'billed_to_tenant' => (bool) $this->billed_to_tenant,
            'tenant_share' => (float) $this->tenant_share,
            'type' => $this->type,
            'maintenance_date' => $this->maintenance_date?->toDateString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'unit_number' => $this->unit->unit_number,
                'property_id' => $this->unit->property_id,
                'property' => $this->unit->relationLoaded('property') && $this->unit->property ? [
                    'id' => $this->unit->property->id,
                    'name' => $this->unit->property->name,
                ] : null,
            ]),
            'asset' => $this->whenLoaded('asset', fn () => [
                'id' => $this->asset->id,
                'name' => $this->asset->name,
            ]),
        ];
    }
}


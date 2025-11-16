<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\UnitOccupancyHistory */
class UnitOccupancyHistoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'unit_id' => $this->unit_id,
            'tenant_id' => $this->tenant_id,
            'tenant_unit_id' => $this->tenant_unit_id,
            'action' => $this->action,
            'action_date' => $this->action_date?->toDateString(),
            'rent_amount' => $this->rent_amount !== null ? (float) $this->rent_amount : null,
            'security_deposit_amount' => $this->security_deposit_amount !== null ? (float) $this->security_deposit_amount : null,
            'lease_start_date' => $this->lease_start_date?->toDateString(),
            'lease_end_date' => $this->lease_end_date?->toDateString(),
            'notes' => $this->notes,
            'created_at' => $this->formatDateTime($this->created_at),
            'updated_at' => $this->formatDateTime($this->updated_at),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'unit_number' => $this->unit->unit_number,
                'property_id' => $this->unit->property_id,
            ]),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'full_name' => $this->tenant->full_name,
            ]),
            'tenant_unit' => $this->whenLoaded('tenantUnit', fn () => [
                'id' => $this->tenantUnit->id,
                'status' => $this->tenantUnit->status,
                'lease_start' => $this->tenantUnit->lease_start?->toDateString(),
                'lease_end' => $this->tenantUnit->lease_end?->toDateString(),
            ]),
        ];
    }

    private function formatDateTime($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        return \Illuminate\Support\Carbon::parse($value)->toISOString();
    }
}


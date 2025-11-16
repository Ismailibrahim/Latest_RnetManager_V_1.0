<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Unit */
class UnitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'landlord_id' => $this->landlord_id,
            'unit_type_id' => $this->unit_type_id,
            'unit_number' => $this->unit_number,
            'rent_amount' => (float) $this->rent_amount,
            'security_deposit' => $this->security_deposit !== null ? (float) $this->security_deposit : null,
            'is_occupied' => (bool) $this->is_occupied,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'assets_count' => $this->whenCounted('assets'),
            'property' => $this->whenLoaded('property', fn () => [
                'id' => $this->property->id,
                'name' => $this->property->name,
            ]),
            'unit_type' => $this->whenLoaded('unitType', fn () => [
                'id' => $this->unitType->id,
                'name' => $this->unitType->name,
            ]),
        ];
    }
}


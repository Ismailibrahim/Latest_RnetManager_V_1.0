<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Property */
class PropertyResource extends JsonResource
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
            'landlord_id' => $this->landlord_id,
            'name' => $this->name,
            'address' => $this->address,
            'type' => $this->type,
            'units_count' => $this->when(isset($this->units_count), (int) $this->units_count),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'units' => UnitResource::collection($this->whenLoaded('units')),
            'landlord' => $this->whenLoaded('landlord', function () {
                return [
                    'id' => $this->landlord->id,
                    'company_name' => $this->landlord->company_name,
                ];
            }),
        ];
    }
}


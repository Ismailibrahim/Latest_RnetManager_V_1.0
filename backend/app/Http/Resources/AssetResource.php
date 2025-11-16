<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Asset */
class AssetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_type_id' => $this->asset_type_id,
            'unit_id' => $this->unit_id,
            'ownership' => $this->ownership,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'brand' => $this->brand,
            'model' => $this->model,
            'location' => $this->location,
            'installation_date' => $this->installation_date?->toDateString(),
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'asset_type' => $this->whenLoaded('assetType', fn () => [
                'id' => $this->assetType->id,
                'name' => $this->assetType->name,
                'category' => $this->assetType->category,
            ]),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'unit_number' => $this->unit->unit_number,
                'property_id' => $this->unit->property_id,
            ]),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'full_name' => $this->tenant->full_name,
            ]),
        ];
    }
}


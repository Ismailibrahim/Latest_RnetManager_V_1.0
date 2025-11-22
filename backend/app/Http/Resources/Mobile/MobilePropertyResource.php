<?php

namespace App\Http\Resources\Mobile;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Property */
class MobilePropertyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Simplified for mobile - only essential fields.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'type' => $this->type,
            'units_count' => $this->when(isset($this->units_count), (int) $this->units_count),
        ];
    }
}


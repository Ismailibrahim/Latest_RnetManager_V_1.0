<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\RentInvoice */
class RentInvoiceResource extends JsonResource
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
            'tenant_unit_id' => $this->tenant_unit_id,
            'landlord_id' => $this->landlord_id,
            'invoice_number' => $this->invoice_number,
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'rent_amount' => (float) $this->rent_amount,
            'late_fee' => (float) $this->late_fee,
            'status' => $this->status,
            'paid_date' => $this->paid_date?->toDateString(),
            'payment_method' => $this->payment_method,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenant_unit' => $this->whenLoaded('tenantUnit', fn () => TenantUnitResource::make($this->tenantUnit)),
        ];
    }
}


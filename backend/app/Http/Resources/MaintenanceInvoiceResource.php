<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\MaintenanceInvoice */
class MaintenanceInvoiceResource extends JsonResource
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
            'maintenance_request_id' => $this->maintenance_request_id,
            'invoice_number' => $this->invoice_number,
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'status' => $this->status,
            'labor_cost' => (float) $this->labor_cost,
            'parts_cost' => (float) $this->parts_cost,
            'tax_amount' => (float) $this->tax_amount,
            'misc_amount' => (float) $this->misc_amount,
            'discount_amount' => (float) $this->discount_amount,
            'grand_total' => (float) $this->grand_total,
            'line_items' => $this->line_items ?? [],
            'notes' => $this->notes,
            'paid_date' => $this->paid_date?->toDateString(),
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenant_unit' => $this->whenLoaded('tenantUnit', fn () => TenantUnitResource::make($this->tenantUnit)),
            'maintenance_request' => $this->whenLoaded('maintenanceRequest', fn () => MaintenanceRequestResource::make($this->maintenanceRequest)),
        ];
    }
}


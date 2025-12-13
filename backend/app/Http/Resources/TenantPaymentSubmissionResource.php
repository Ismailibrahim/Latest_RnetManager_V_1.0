<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantPaymentSubmissionResource extends JsonResource
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
            'rent_invoice_id' => $this->rent_invoice_id,
            'landlord_id' => $this->landlord_id,
            'payment_amount' => (float) $this->payment_amount,
            'payment_date' => $this->payment_date?->toDateString(),
            'payment_method' => $this->payment_method,
            'receipt_path' => $this->receipt_path,
            'status' => $this->status,
            'confirmed_by' => $this->confirmed_by,
            'confirmed_at' => $this->confirmed_at?->toISOString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenant_unit' => $this->whenLoaded('tenantUnit', function () {
                $tenantUnit = $this->tenantUnit;
                return [
                    'id' => $tenantUnit->id,
                    'currency' => $tenantUnit->currency ?? 'MVR',
                    'tenant' => $tenantUnit->relationLoaded('tenant') && $tenantUnit->tenant
                        ? [
                            'id' => $tenantUnit->tenant->id,
                            'full_name' => $tenantUnit->tenant->full_name,
                            'email' => $tenantUnit->tenant->email,
                            'phone' => $tenantUnit->tenant->phone,
                        ]
                        : null,
                    'unit' => $tenantUnit->relationLoaded('unit') && $tenantUnit->unit
                        ? [
                            'id' => $tenantUnit->unit->id,
                            'unit_number' => $tenantUnit->unit->unit_number,
                            'property' => ($tenantUnit->unit->relationLoaded('property') && $tenantUnit->unit->property)
                                ? [
                                    'id' => $tenantUnit->unit->property->id,
                                    'name' => $tenantUnit->unit->property->name,
                                ]
                                : null,
                        ]
                        : null,
                ];
            }),
            'rent_invoice' => $this->whenLoaded('rentInvoice', function () {
                return [
                    'id' => $this->rentInvoice->id,
                    'invoice_number' => $this->rentInvoice->invoice_number,
                    'invoice_date' => $this->rentInvoice->invoice_date?->toDateString(),
                    'due_date' => $this->rentInvoice->due_date?->toDateString(),
                    'rent_amount' => (float) $this->rentInvoice->rent_amount,
                    'late_fee' => (float) $this->rentInvoice->late_fee,
                ];
            }),
            'confirmed_by_user' => $this->whenLoaded('confirmedBy', function () {
                return [
                    'id' => $this->confirmedBy->id,
                    'first_name' => $this->confirmedBy->first_name,
                    'last_name' => $this->confirmedBy->last_name,
                    'email' => $this->confirmedBy->email,
                ];
            }),
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SecurityDepositRefund */
class SecurityDepositRefundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_unit_id' => $this->tenant_unit_id,
            'landlord_id' => $this->landlord_id,
            'refund_number' => $this->refund_number,
            'refund_date' => $this->refund_date?->toDateString(),
            'original_deposit' => (float) $this->original_deposit,
            'deductions' => (float) $this->deductions,
            'refund_amount' => (float) $this->refund_amount,
            'deduction_reasons' => $this->deduction_reasons,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'transaction_reference' => $this->transaction_reference,
            'receipt_generated' => (bool) $this->receipt_generated,
            'receipt_number' => $this->receipt_number,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenant_unit' => $this->whenLoaded('tenantUnit', function () {
                return [
                    'id' => $this->tenantUnit->id,
                    'tenant_id' => $this->tenantUnit->tenant_id,
                    'unit_id' => $this->tenantUnit->unit_id,
                    'tenant' => $this->tenantUnit->tenant
                        ? [
                            'id' => $this->tenantUnit->tenant->id,
                            'full_name' => $this->tenantUnit->tenant->full_name,
                        ]
                        : null,
                    'unit' => $this->tenantUnit->unit
                        ? [
                            'id' => $this->tenantUnit->unit->id,
                            'unit_number' => $this->tenantUnit->unit->unit_number,
                            'property_id' => $this->tenantUnit->unit->property_id,
                            'property' => $this->tenantUnit->unit->property
                                ? [
                                    'id' => $this->tenantUnit->unit->property->id,
                                    'name' => $this->tenantUnit->unit->property->name,
                                ]
                                : null,
                        ]
                        : null,
                ];
            }),
        ];
    }
}


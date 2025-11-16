<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FinancialRecord */
class FinancialRecordResource extends JsonResource
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
            'tenant_unit_id' => $this->tenant_unit_id,
            'type' => $this->type,
            'category' => $this->category,
            'amount' => (float) $this->amount,
            'description' => $this->description,
            'due_date' => $this->due_date?->toDateString(),
            'paid_date' => $this->paid_date?->toDateString(),
            'transaction_date' => $this->transaction_date?->toDateString(),
            'invoice_number' => $this->invoice_number,
            'payment_method' => $this->payment_method,
            'reference_number' => $this->reference_number,
            'parent_id' => $this->parent_id,
            'is_installment' => (bool) $this->is_installment,
            'installment_number' => $this->installment_number,
            'total_installments' => $this->total_installments,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenant_unit' => $this->whenLoaded('tenantUnit', fn () => TenantUnitResource::make($this->tenantUnit)),
            'children' => FinancialRecordResource::collection($this->whenLoaded('installments')),
        ];
    }
}


<?php

namespace App\Http\Resources\Mobile;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\RentInvoice */
class MobileInvoiceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Simplified invoice data for mobile.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $totalAmount = (float) $this->rent_amount + (float) ($this->late_fee ?? 0);
        $amountDue = $totalAmount - (float) ($this->advance_rent_applied ?? 0);

        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'rent_amount' => (float) $this->rent_amount,
            'late_fee' => (float) ($this->late_fee ?? 0),
            'advance_rent_applied' => (float) ($this->advance_rent_applied ?? 0),
            'total_amount' => $totalAmount,
            'amount_due' => $amountDue,
            'status' => $this->status,
            'paid_date' => $this->paid_date?->toDateString(),
            'payment_method' => $this->payment_method,
            'created_at' => $this->created_at?->toISOString(),
            
            // Tenant info if loaded
            'tenant' => $this->when(
                $this->relationLoaded('tenantUnit') && 
                $this->tenantUnit?->relationLoaded('tenant') && 
                $this->tenantUnit->tenant !== null,
                fn () => [
                    'id' => $this->tenantUnit->tenant->id,
                    'full_name' => $this->tenantUnit->tenant->full_name,
                ]
            ),
        ];
    }
}


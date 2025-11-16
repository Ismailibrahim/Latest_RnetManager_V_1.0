<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\SubscriptionInvoice
 */
class SubscriptionInvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'issued_at' => $this->issued_at,
            'due_at' => $this->due_at,
            'paid_at' => $this->paid_at,
            'period_start' => $this->period_start,
            'period_end' => $this->period_end,
            'download_url' => $this->download_url,
        ];
    }
}



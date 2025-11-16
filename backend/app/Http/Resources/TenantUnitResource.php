<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\TenantUnit */
class TenantUnitResource extends JsonResource
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
            'tenant_id' => $this->tenant_id,
            'unit_id' => $this->unit_id,
            'landlord_id' => $this->landlord_id,
            'lease_start' => $this->lease_start?->toDateString(),
            'lease_end' => $this->lease_end?->toDateString(),
            'monthly_rent' => (float) $this->monthly_rent,
            'security_deposit_paid' => (float) $this->security_deposit_paid,
            'advance_rent_months' => $this->advance_rent_months,
            'advance_rent_amount' => (float) $this->advance_rent_amount,
            'notice_period_days' => $this->notice_period_days,
            'lock_in_period_months' => $this->lock_in_period_months,
            'lease_document_path' => $this->lease_document_path,
            'lease_document_url' => $this->when(
                $this->lease_document_path,
                function () {
                    if (filter_var($this->lease_document_path, FILTER_VALIDATE_URL)) {
                        return $this->lease_document_path;
                    }

                    $disk = config('filesystems.default', 'local');

                    try {
                        return Storage::disk($disk)->temporaryUrl(
                            $this->lease_document_path,
                            now()->addMinutes(15),
                        );
                    } catch (\Throwable $exception) {
                        try {
                            return Storage::disk($disk)->url($this->lease_document_path);
                        } catch (\Throwable $inner) {
                            return null;
                        }
                    }
                },
            ),
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'unit_number' => $this->unit->unit_number,
                'property_id' => $this->unit->property_id,
                'property' => $this->when($this->unit->relationLoaded('property') && $this->unit->property, fn () => [
                    'id' => $this->unit->property->id,
                    'name' => $this->unit->property->name,
                ]),
            ]),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'full_name' => $this->tenant->full_name,
            ]),
        ];
    }
}


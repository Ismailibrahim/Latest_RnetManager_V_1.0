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
            'currency' => $this->getCurrency(),
            'security_deposit_paid' => (float) $this->security_deposit_paid,
            'advance_rent_months' => $this->advance_rent_months,
            'advance_rent_amount' => (float) $this->advance_rent_amount,
            'advance_rent_used' => (float) ($this->advance_rent_used ?? 0),
            'advance_rent_remaining' => (float) $this->advance_rent_remaining,
            'advance_rent_collected_date' => $this->advance_rent_collected_date?->toDateString(),
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
                'currency' => $this->unit->currency ?? 'MVR',
                'security_deposit' => $this->unit->security_deposit !== null ? (float) $this->unit->security_deposit : null,
                'security_deposit_currency' => $this->unit->security_deposit_currency ?? $this->unit->currency ?? 'MVR',
                'property' => $this->when($this->unit->relationLoaded('property') && $this->unit->property, fn () => [
                    'id' => $this->unit->property->id,
                    'name' => $this->unit->property->name,
                ]),
            ]),
            'security_deposit_currency' => $this->getSecurityDepositCurrency(),
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'full_name' => $this->tenant->full_name,
            ]),
        ];
    }

    /**
     * Get the currency for this tenant unit, preferring unit currency if tenant-unit currency is default MVR
     */
    private function getCurrency(): string
    {
        $tenantUnitCurrency = $this->currency;
        
        // Get unit currency - unit should be loaded by the controller
        $unitCurrency = null;
        if ($this->relationLoaded('unit') && $this->unit) {
            $unitCurrency = $this->unit->currency;
        }
        
        // If tenant-unit has a currency set and it's not the default MVR, use it
        if ($tenantUnitCurrency && strtoupper(trim($tenantUnitCurrency)) !== 'MVR') {
            return strtoupper(trim($tenantUnitCurrency));
        }
        
        // Otherwise, prefer unit currency, then tenant-unit currency, then default to MVR
        if ($unitCurrency) {
            return strtoupper(trim($unitCurrency));
        }
        
        if ($tenantUnitCurrency) {
            return strtoupper(trim($tenantUnitCurrency));
        }
        
        return 'MVR';
    }

    /**
     * Get the security deposit currency for this tenant unit, preferring unit security_deposit_currency
     */
    private function getSecurityDepositCurrency(): string
    {
        // Get unit security deposit currency - unit should be loaded by the controller
        $unitSecurityDepositCurrency = null;
        if ($this->relationLoaded('unit') && $this->unit) {
            $unitSecurityDepositCurrency = $this->unit->security_deposit_currency;
        }
        
        // If unit has security_deposit_currency, use it
        if ($unitSecurityDepositCurrency) {
            return strtoupper(trim($unitSecurityDepositCurrency));
        }
        
        // Otherwise, fall back to unit's regular currency, then tenant-unit currency, then default to MVR
        $unitCurrency = null;
        if ($this->relationLoaded('unit') && $this->unit) {
            $unitCurrency = $this->unit->currency;
        }
        
        if ($unitCurrency) {
            return strtoupper(trim($unitCurrency));
        }
        
        $tenantUnitCurrency = $this->currency;
        if ($tenantUnitCurrency) {
            return strtoupper(trim($tenantUnitCurrency));
        }
        
        return 'MVR';
    }
}


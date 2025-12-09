<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Schema;

/** @mixin \App\Models\Unit */
class UnitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $currencyCode = $this->currency ?? 'MVR';
        $securityDepositCurrencyCode = $this->security_deposit_currency ?? $currencyCode;
        
        // Currency symbol mapping (fallback if database doesn't have symbols)
        // Official MVR symbol: ރ (Thaana letter "Raa" - Unicode U+0783)
        // Only MVR and USD are supported in this application
        $currencySymbolMap = [
            'MVR' => 'ރ', // Official Rufiyaa symbol
            'USD' => '$',
        ];
        
        // Get currency symbols from database if available, otherwise use fallback
        $currencySymbol = $currencySymbolMap[$currencyCode] ?? null;
        $securityDepositCurrencySymbol = $currencySymbolMap[$securityDepositCurrencyCode] ?? null;
        
        try {
            if (Schema::hasTable('currencies')) {
                $currency = \App\Models\Currency::where('code', $currencyCode)->first();
                // Use database symbol if available, otherwise keep fallback
                if ($currency?->symbol) {
                    $currencySymbol = $currency->symbol;
                }
                
                $securityDepositCurrency = \App\Models\Currency::where('code', $securityDepositCurrencyCode)->first();
                // Use database symbol if available, otherwise keep fallback
                if ($securityDepositCurrency?->symbol) {
                    $securityDepositCurrencySymbol = $securityDepositCurrency->symbol;
                }
            }
        } catch (\Exception $e) {
            // Ignore errors - currencies table might not exist, use fallback symbols
        }
        
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'landlord_id' => $this->landlord_id,
            'unit_type_id' => $this->unit_type_id,
            'unit_number' => $this->unit_number,
            'rent_amount' => (float) $this->rent_amount,
            'currency' => $currencyCode,
            'currency_symbol' => $currencySymbol,
            'security_deposit' => $this->security_deposit !== null ? (float) $this->security_deposit : null,
            'security_deposit_currency' => $securityDepositCurrencyCode,
            'security_deposit_currency_symbol' => $securityDepositCurrencySymbol,
            'is_occupied' => (bool) $this->is_occupied,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'assets_count' => $this->whenCounted('assets'),
            'property' => $this->whenLoaded('property', fn () => [
                'id' => $this->property->id,
                'name' => $this->property->name,
            ]),
            'unit_type' => $this->whenLoaded('unitType', fn () => [
                'id' => $this->unitType->id,
                'name' => $this->unitType->name,
            ]),
        ];
    }
}


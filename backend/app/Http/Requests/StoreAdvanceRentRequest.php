<?php

namespace App\Http\Requests;

use App\Models\TenantUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdvanceRentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $tenantUnit = $this->route('tenantUnit');
        
        if (!$tenantUnit instanceof TenantUnit) {
            return false;
        }

        // Ensure tenant unit belongs to authenticated user's landlord
        return $tenantUnit->landlord_id === $this->user()?->landlord_id 
            && $this->user()?->can('update', $tenantUnit);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'advance_rent_months' => ['required', 'integer', 'min:1', 'max:12'],
            'advance_rent_amount' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'transaction_date' => ['required', 'date'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'advance_rent_months.required' => 'The number of advance rent months is required.',
            'advance_rent_months.integer' => 'Advance rent months must be a whole number.',
            'advance_rent_months.min' => 'Advance rent months must be at least 1.',
            'advance_rent_months.max' => 'Advance rent months cannot exceed 12.',
            'advance_rent_amount.required' => 'The advance rent amount is required.',
            'advance_rent_amount.numeric' => 'Advance rent amount must be a valid number.',
            'advance_rent_amount.min' => 'Advance rent amount cannot be negative.',
            'transaction_date.required' => 'The transaction date is required.',
            'transaction_date.date' => 'Transaction date must be a valid date.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // If amount is not provided but months are, calculate from tenant unit's monthly rent
        if ($this->has('advance_rent_months') && !$this->has('advance_rent_amount')) {
            $tenantUnit = $this->route('tenantUnit');
            if ($tenantUnit instanceof TenantUnit && $tenantUnit->monthly_rent) {
                $months = (int) $this->input('advance_rent_months');
                $calculatedAmount = (float) $tenantUnit->monthly_rent * $months;
                $this->merge(['advance_rent_amount' => $calculatedAmount]);
            }
        }
    }
}


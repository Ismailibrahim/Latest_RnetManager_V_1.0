<?php

namespace App\Http\Requests;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Unit::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();

        // Property validation rule
        if ($isSuperAdmin) {
            // Super admin can use any property, but must specify landlord_id
            $propertyRule = Rule::exists('properties', 'id');
            $landlordIdRule = ['required', 'integer', Rule::exists('landlords', 'id')];
        } else {
            // Regular users can only use their landlord's properties
            $propertyRule = Rule::exists('properties', 'id')
                ->where('landlord_id', $user?->landlord_id);
            $landlordIdRule = [];
        }

        $unitNumberRule = Rule::unique('units', 'unit_number')
            ->where(fn ($query) => $query->where('property_id', $this->input('property_id')));

        $rules = [
            'property_id' => ['required', 'integer', $propertyRule],
            'unit_type_id' => [
                'required',
                'integer',
                Rule::exists('unit_types', 'id')->where('is_active', true),
            ],
            'unit_number' => ['required', 'string', 'max:50', $unitNumberRule],
            'rent_amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3', Rule::in(['MVR', 'USD'])],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'security_deposit_currency' => ['nullable', 'string', 'size:3', Rule::in(['MVR', 'USD'])],
            'is_occupied' => ['sometimes', 'boolean'],
        ];

        // Add landlord_id rule for super admins
        if ($isSuperAdmin) {
            $rules['landlord_id'] = $landlordIdRule;
        }

        return $rules;
    }
}

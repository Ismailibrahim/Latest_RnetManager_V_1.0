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
        $propertyRule = Rule::exists('properties', 'id')
            ->where('landlord_id', $this->user()?->landlord_id);

        $unitNumberRule = Rule::unique('units', 'unit_number')
            ->where(fn ($query) => $query->where('property_id', $this->input('property_id')));

        return [
            'property_id' => ['required', 'integer', $propertyRule],
            'unit_type_id' => [
                'required',
                'integer',
                Rule::exists('unit_types', 'id')->where('is_active', true),
            ],
            'unit_number' => ['required', 'string', 'max:50', $unitNumberRule],
            'rent_amount' => ['required', 'numeric', 'min:0'],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'is_occupied' => ['sometimes', 'boolean'],
        ];
    }
}

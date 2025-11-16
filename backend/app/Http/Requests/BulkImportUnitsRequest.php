<?php

namespace App\Http\Requests;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkImportUnitsRequest extends FormRequest
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
        $landlordId = $this->user()?->landlord_id;
        $mode = $this->input('mode', 'create');

        return [
            'mode' => ['required', 'string', Rule::in(['create', 'upsert'])],
            'units' => ['required', 'array', 'min:1'],
            'units.*.property_name' => ['nullable', 'string', 'max:255'],
            'units.*.property_id' => [
                'nullable',
                'integer',
                Rule::exists('properties', 'id')->where('landlord_id', $landlordId),
            ],
            'units.*.unit_type_name' => ['nullable', 'string', 'max:100'],
            'units.*.unit_type_id' => [
                'nullable',
                'integer',
                Rule::exists('unit_types', 'id')->where('is_active', true),
            ],
            'units.*.unit_number' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($mode) {
                    $index = (int) str_replace('units.', '', explode('.', $attribute)[0]);
                    $propertyId = $this->input("units.{$index}.property_id");
                    
                    if ($propertyId && $mode === 'create') {
                        $exists = Unit::where('property_id', $propertyId)
                            ->where('unit_number', $value)
                            ->exists();
                        
                        if ($exists) {
                            $fail("Unit number '{$value}' already exists for this property. Use 'upsert' mode to update existing units.");
                        }
                    }
                },
            ],
            'units.*.rent_amount' => ['required', 'numeric', 'min:0'],
            'units.*.security_deposit' => ['nullable', 'numeric', 'min:0'],
            'units.*.is_occupied' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'units.required' => 'At least one unit is required for import.',
            'units.*.unit_number.required' => 'Unit number is required for all units.',
            'units.*.rent_amount.required' => 'Rent amount is required for all units.',
            'units.*.rent_amount.numeric' => 'Rent amount must be a valid number.',
            'units.*.rent_amount.min' => 'Rent amount must be greater than or equal to 0.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $units = $this->input('units', []);

        foreach ($units as $index => $unit) {
            // Convert boolean strings to actual booleans
            if (isset($unit['is_occupied'])) {
                $value = $unit['is_occupied'];
                if (is_string($value)) {
                    $units[$index]['is_occupied'] = in_array(strtolower($value), ['true', '1', 'yes', 'y'], true);
                }
            }

            // Ensure numeric fields are numeric
            if (isset($unit['rent_amount'])) {
                $units[$index]['rent_amount'] = (float) $unit['rent_amount'];
            }
            if (isset($unit['security_deposit']) && $unit['security_deposit'] !== null && $unit['security_deposit'] !== '') {
                $units[$index]['security_deposit'] = (float) $unit['security_deposit'];
            }
        }

        $this->merge(['units' => $units]);
    }
}


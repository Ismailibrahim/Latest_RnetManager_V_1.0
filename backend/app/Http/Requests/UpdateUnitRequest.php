<?php

namespace App\Http\Requests;

use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $unit = $this->route('unit');

        if (! $unit instanceof Unit) {
            return false;
        }

        return $this->user()?->can('update', $unit) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\Unit|null $unit */
        $unit = $this->route('unit');

        $currentPropertyId = $this->input('property_id') ?? $unit?->property_id;

        $propertyRule = Rule::exists('properties', 'id')
            ->where('landlord_id', $this->user()?->landlord_id);

        $unitNumberRule = Rule::unique('units', 'unit_number')
            ->where(fn ($query) => $query->where('property_id', $currentPropertyId))
            ->ignore($unit?->id);

        return [
            'property_id' => ['sometimes', 'required', 'integer', $propertyRule],
            'unit_type_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('unit_types', 'id')->where('is_active', true),
            ],
            'unit_number' => ['sometimes', 'required', 'string', 'max:50', $unitNumberRule],
            'rent_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'security_deposit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_occupied' => ['sometimes', 'boolean'],
        ];
    }
}

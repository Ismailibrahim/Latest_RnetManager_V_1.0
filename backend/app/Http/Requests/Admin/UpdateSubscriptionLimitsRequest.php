<?php

namespace App\Http\Requests\Admin;

use App\Models\Landlord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriptionLimitsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'max_properties' => ['required', 'integer', 'min:0'],
            'max_units' => ['required', 'integer', 'min:0'],
            'max_users' => ['required', 'integer', 'min:1'],
            'monthly_price' => ['required', 'numeric', 'min:0'],
            'features' => ['sometimes', 'array'],
            'features.*' => ['string'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'max_properties.required' => 'Maximum properties is required.',
            'max_properties.integer' => 'Maximum properties must be an integer.',
            'max_properties.min' => 'Maximum properties cannot be negative.',
            'max_units.required' => 'Maximum units is required.',
            'max_units.integer' => 'Maximum units must be an integer.',
            'max_units.min' => 'Maximum units cannot be negative.',
            'max_users.required' => 'Maximum users is required.',
            'max_users.integer' => 'Maximum users must be an integer.',
            'max_users.min' => 'Maximum users must be at least 1.',
            'monthly_price.required' => 'Monthly price is required.',
            'monthly_price.numeric' => 'Monthly price must be a number.',
            'monthly_price.min' => 'Monthly price cannot be negative.',
            'features.array' => 'Features must be an array.',
        ];
    }
}

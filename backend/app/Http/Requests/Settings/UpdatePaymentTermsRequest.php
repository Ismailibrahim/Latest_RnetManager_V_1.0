<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentTermsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'default_due_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
            'late_fee_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'late_fee_fixed' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'grace_period_days' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:30'],
        ];
    }
}


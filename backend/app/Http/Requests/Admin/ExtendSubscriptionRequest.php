<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ExtendSubscriptionRequest extends FormRequest
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
            'months' => [
                'required_without:subscription_expires_at',
                'integer',
                'min:1',
                'max:12',
            ],
            'subscription_expires_at' => [
                'required_without:months',
                'date',
                'after:today',
            ],
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
            'months.required_without' => 'Either months or expiry date must be provided.',
            'months.integer' => 'Months must be a whole number.',
            'months.min' => 'Months must be at least 1.',
            'months.max' => 'Months cannot exceed 12.',
            'subscription_expires_at.required_without' => 'Either months or expiry date must be provided.',
            'subscription_expires_at.date' => 'Expiry date must be a valid date.',
            'subscription_expires_at.after' => 'Expiry date must be in the future.',
        ];
    }
}


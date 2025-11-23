<?php

namespace App\Http\Requests\Admin;

use App\Models\Landlord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLandlordSubscriptionRequest extends FormRequest
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
            'subscription_tier' => [
                'required',
                Rule::in([Landlord::TIER_BASIC, Landlord::TIER_PRO, Landlord::TIER_ENTERPRISE]),
            ],
            'subscription_expires_at' => [
                'nullable',
                'date',
                'after:today',
            ],
            'subscription_auto_renew' => [
                'sometimes',
                'boolean',
            ],
            'subscription_started_at' => [
                'nullable',
                'date',
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
            'subscription_tier.required' => 'Subscription tier is required.',
            'subscription_tier.in' => 'Subscription tier must be one of: basic, pro, enterprise.',
            'subscription_expires_at.date' => 'Expiry date must be a valid date.',
            'subscription_expires_at.after' => 'Expiry date must be in the future.',
        ];
    }
}


<?php

namespace App\Http\Requests\Landlord;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLandlordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_active ?? false;
    }

    public function rules(): array
    {
        return [
            'subscription_tier' => ['nullable', 'in:basic,pro,enterprise'],
            'owner.first_name' => ['required', 'string', 'max:100'],
            'owner.last_name' => ['required', 'string', 'max:100'],
            'owner.email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'owner.mobile' => ['required', 'string', 'max:20'],
            'owner.password' => ['nullable', 'string', 'min:6'],
            // company_name is NOT validated - handled in controller
        ];
    }

    public function messages(): array
    {
        return [
            'owner.email.unique' => 'This email address is already registered.',
            'owner.email.required' => 'Owner email is required.',
            'owner.email.email' => 'Please enter a valid email address.',
        ];
    }
}

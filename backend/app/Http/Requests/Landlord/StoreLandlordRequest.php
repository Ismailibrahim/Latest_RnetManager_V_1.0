<?php

namespace App\Http\Requests\Landlord;

use Illuminate\Foundation\Http\FormRequest;

class StoreLandlordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated user can create a landlord (adjust with policy if needed)
        return $this->user()?->is_active ?? false;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'subscription_tier' => ['nullable', 'in:basic,pro,enterprise'],
            // Optional owner user payload
            'owner.first_name' => ['required', 'string', 'max:100'],
            'owner.last_name' => ['required', 'string', 'max:100'],
            'owner.email' => ['required', 'email', 'max:255'],
            'owner.mobile' => ['required', 'string', 'max:20'],
            'owner.password' => ['nullable', 'string', 'min:6'],
        ];
    }
}



<?php

namespace App\Http\Requests\Auth;

use App\Models\Landlord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SignupRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Signup is always allowed (public endpoint).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:2', 'max:200'],
            'email' => [
                'required',
                'email:rfc,dns',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/',
            ],
            'password_confirmation' => ['required', 'string'],
            'subscription_tier' => [
                'required',
                'string',
                Rule::in([Landlord::TIER_BASIC, Landlord::TIER_PRO, Landlord::TIER_ENTERPRISE]),
            ],
            'mobile' => [
                'required',
                'string',
                'max:20',
                'regex:/^[+]?[\d\s\-()]+$/',
            ],
            'company' => ['nullable', 'string', 'max:255'],
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
            'full_name.required' => 'Full name is required.',
            'full_name.min' => 'Full name must be at least 2 characters.',
            'full_name.max' => 'Full name cannot exceed 200 characters.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already registered.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters long.',
            'password.confirmed' => 'Password confirmation does not match.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'password_confirmation.required' => 'Please confirm your password.',
            'subscription_tier.required' => 'Please select a subscription tier.',
            'subscription_tier.in' => 'Please select a valid subscription tier.',
            'mobile.required' => 'Mobile number is required.',
            'mobile.regex' => 'Please provide a valid mobile number.',
            'company.max' => 'Company name cannot exceed 255 characters.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'full_name' => 'full name',
            'password_confirmation' => 'password confirmation',
            'subscription_tier' => 'subscription tier',
            'company' => 'company name',
        ];
    }
}

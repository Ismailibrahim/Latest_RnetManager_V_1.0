<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmailSettingsRequest extends FormRequest
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
            'provider' => ['sometimes', 'string', 'in:gmail,office365'],
            'enabled' => ['sometimes', 'boolean'],
            'from_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'from_address' => ['sometimes', 'nullable', 'email', 'max:255'],
            'smtp_host' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['sometimes', 'nullable', 'string', 'in:tls,ssl'],
            'smtp_username' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_password' => ['sometimes', 'nullable', 'string', 'max:500'],
            'oauth_client_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'oauth_client_secret' => ['sometimes', 'nullable', 'string', 'max:500'],
            'oauth_tenant_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notifications' => ['sometimes', 'array'],
            'notifications.rent_due' => ['sometimes', 'array'],
            'notifications.rent_due.enabled' => ['sometimes', 'boolean'],
            'notifications.rent_due.template_id' => ['sometimes', 'nullable', 'integer'],
            'notifications.rent_received' => ['sometimes', 'array'],
            'notifications.rent_received.enabled' => ['sometimes', 'boolean'],
            'notifications.rent_received.template_id' => ['sometimes', 'nullable', 'integer'],
            'notifications.maintenance_request' => ['sometimes', 'array'],
            'notifications.maintenance_request.enabled' => ['sometimes', 'boolean'],
            'notifications.maintenance_request.template_id' => ['sometimes', 'nullable', 'integer'],
            'notifications.lease_expiry' => ['sometimes', 'array'],
            'notifications.lease_expiry.enabled' => ['sometimes', 'boolean'],
            'notifications.lease_expiry.template_id' => ['sometimes', 'nullable', 'integer'],
            'notifications.security_deposit' => ['sometimes', 'array'],
            'notifications.security_deposit.enabled' => ['sometimes', 'boolean'],
            'notifications.security_deposit.template_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}


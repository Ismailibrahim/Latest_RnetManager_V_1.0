<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTelegramSettingsRequest extends FormRequest
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
            'enabled' => ['sometimes', 'boolean'],
            'bot_token' => ['sometimes', 'nullable', 'string', 'max:500'],
            'chat_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'parse_mode' => ['sometimes', 'nullable', 'string', 'in:Markdown,HTML,None'],
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
            'notifications.system' => ['sometimes', 'array'],
            'notifications.system.enabled' => ['sometimes', 'boolean'],
            'notifications.system.template_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}


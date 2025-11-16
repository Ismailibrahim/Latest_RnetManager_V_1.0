<?php

namespace App\Http\Requests\SmsTemplate;

use Illuminate\Foundation\Http\FormRequest;

class StoreSmsTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:rent_due,rent_received,maintenance_request,lease_expiry,security_deposit,system'],
            'message' => ['required', 'string', 'max:1600'], // SMS max length consideration
            'variables' => ['nullable', 'array'],
            'variables.*' => ['string', 'max:100'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}


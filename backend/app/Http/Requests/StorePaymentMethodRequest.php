<?php

namespace App\Http\Requests;

use App\Models\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', PaymentMethod::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('payment_methods', 'name')],
            'is_active' => ['sometimes', 'boolean'],
            'supports_reference' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        $data['is_active'] = $data['is_active'] ?? true;
        $data['supports_reference'] = $data['supports_reference'] ?? false;
        $data['sort_order'] = $data['sort_order'] ?? 0;

        return $data;
    }
}


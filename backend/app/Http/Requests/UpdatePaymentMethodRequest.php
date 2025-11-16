<?php

namespace App\Http\Requests;

use App\Models\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var PaymentMethod|null $paymentMethod */
        $paymentMethod = $this->route('payment_method');

        if (! $paymentMethod instanceof PaymentMethod) {
            return false;
        }

        return $this->user()?->can('update', $paymentMethod) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var PaymentMethod|null $paymentMethod */
        $paymentMethod = $this->route('payment_method');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:120',
                Rule::unique('payment_methods', 'name')->ignore($paymentMethod?->id),
            ],
            'is_active' => ['sometimes', 'boolean'],
            'supports_reference' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }
}


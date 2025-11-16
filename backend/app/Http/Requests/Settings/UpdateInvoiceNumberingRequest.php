<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceNumberingRequest extends FormRequest
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
            'rent_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'maintenance_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'financial_record_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'maintenance_request_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'subscription_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'receipt_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'refund_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'format' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reset_monthly' => ['sometimes', 'boolean'],
        ];
    }
}


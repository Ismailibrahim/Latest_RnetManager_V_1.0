<?php

namespace App\Http\Requests\DocumentTemplate;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentTemplateRequest extends FormRequest
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
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'type' => [
                'required',
                'string',
                'in:rent_invoice,maintenance_invoice,security_deposit_slip,advance_rent_receipt,fee_collection_receipt,security_deposit_refund,other_income_receipt,payment_voucher,unified_payment_entry',
            ],
            'template_html' => ['required', 'string'],
            'variables' => ['nullable', 'array'],
            'variables.*' => ['string', 'max:100'],
            'is_default' => ['sometimes', 'boolean'],
        ];

        // Super admins can specify landlord_id
        if ($this->user() && $this->user()->isSuperAdmin()) {
            $rules['landlord_id'] = ['required', 'integer', 'exists:landlords,id'];
        }

        return $rules;
    }
}

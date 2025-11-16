<?php

namespace App\Http\Requests;

use App\Models\SecurityDepositRefund;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSecurityDepositRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        $refund = $this->route('security_deposit_refund');

        if (! $refund instanceof SecurityDepositRefund) {
            return false;
        }

        return $this->user()?->can('update', $refund) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var SecurityDepositRefund|null $refund */
        $refund = $this->route('security_deposit_refund');
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['sometimes', 'required', 'integer', $tenantUnitRule],
            'refund_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
                Rule::unique('security_deposit_refunds', 'refund_number')
                    ->where('landlord_id', $landlordId)
                    ->ignore($refund?->id),
            ],
            'refund_date' => ['sometimes', 'required', 'date'],
            'original_deposit' => ['sometimes', 'required', 'numeric', 'min:0'],
            'deductions' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'refund_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'deduction_reasons' => ['sometimes', 'nullable', 'array'],
            'deduction_reasons.*.category' => ['nullable', 'string', 'max:255'],
            'deduction_reasons.*.amount' => ['nullable', 'numeric', 'min:0'],
            'deduction_reasons.*.note' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'processed', 'cancelled'])],
            'payment_method' => ['sometimes', 'nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'transaction_reference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'receipt_generated' => ['sometimes', 'boolean'],
            'receipt_number' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);

        if (array_key_exists('deduction_reasons', $data) && $data['deduction_reasons'] === null) {
            $data['deduction_reasons'] = [];
        }

        if (array_key_exists('receipt_generated', $data)) {
            $data['receipt_generated'] = (bool) $data['receipt_generated'];
        }

        return $data;
    }
}

<?php

namespace App\Http\Requests;

use App\Models\SecurityDepositRefund;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSecurityDepositRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', SecurityDepositRefund::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['required', 'integer', $tenantUnitRule],
            'refund_number' => ['nullable', 'string', 'max:100', Rule::unique('security_deposit_refunds', 'refund_number')->where('landlord_id', $landlordId)->ignore($this->route('security_deposit_refund'))],
            'refund_date' => ['required', 'date'],
            'original_deposit' => ['required', 'numeric', 'min:0'],
            'deductions' => ['nullable', 'numeric', 'min:0'],
            'refund_amount' => ['required', 'numeric', 'min:0'],
            'deduction_reasons' => ['nullable', 'array'],
            'deduction_reasons.*.category' => ['nullable', 'string', 'max:255'],
            'deduction_reasons.*.amount' => ['nullable', 'numeric', 'min:0'],
            'deduction_reasons.*.note' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['pending', 'processed', 'cancelled'])],
            'payment_method' => ['nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
            'receipt_generated' => ['nullable', 'boolean'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated($key, $default);
        $data['status'] = $data['status'] ?? 'pending';
        $data['receipt_generated'] = array_key_exists('receipt_generated', $data)
            ? (bool) $data['receipt_generated']
            : false;
        $data['deduction_reasons'] = $data['deduction_reasons'] ?? [];

        return $data;
    }
}

<?php

namespace App\Http\Requests;

use App\Models\UnifiedPaymentEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnifiedPaymentEntryRequest extends FormRequest
{
    private const PAYMENT_TYPES = [
        'rent',
        'maintenance_expense',
        'security_refund',
        'fee',
        'other_income',
        'other_outgoing',
    ];

    private const STATUSES = [
        'draft',
        'pending',
        'scheduled',
        'completed',
        'partial',
        'cancelled',
        'failed',
        'refunded',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', UnifiedPaymentEntry::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'payment_type' => ['required', Rule::in(self::PAYMENT_TYPES)],
            'tenant_unit_id' => ['nullable', 'integer', $tenantUnitRule],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'description' => ['nullable', 'string', 'max:500'],
            'due_date' => ['nullable', 'date'],
            'transaction_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'payment_method' => ['nullable', 'string', 'max:150'],
            'reference_number' => ['nullable', 'string', 'max:150'],
            'metadata' => ['nullable', 'array'],
            'source_type' => ['nullable', 'string', 'max:150'],
            'source_id' => ['nullable', 'integer'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $paymentType = $this->input('payment_type');

            $typesRequiringTenantUnit = [
                'rent',
                'maintenance_expense',
                'security_refund',
                'fee',
            ];

            if (in_array($paymentType, $typesRequiringTenantUnit, true) && ! $this->filled('tenant_unit_id')) {
                $validator->errors()->add('tenant_unit_id', 'This payment type requires selecting a tenant/unit.');
            }
        });
    }
}



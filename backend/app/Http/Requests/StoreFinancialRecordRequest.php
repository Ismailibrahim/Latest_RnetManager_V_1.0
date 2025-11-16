<?php

namespace App\Http\Requests;

use App\Models\FinancialRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFinancialRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', FinancialRecord::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        $parentRule = Rule::exists('financial_records', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_unit_id' => ['required', 'integer', $tenantUnitRule],
            'type' => ['required', Rule::in(['rent', 'expense', 'security_deposit', 'refund', 'fee'])],
            'category' => ['required', Rule::in([
                'monthly_rent', 'late_fee', 'processing_fee',
                'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other',
            ])],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['required', 'string', 'max:500'],
            'due_date' => ['nullable', 'date'],
            'paid_date' => ['nullable', 'date'],
            'transaction_date' => ['required', 'date'],
            'invoice_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('financial_records', 'invoice_number')->where('landlord_id', $landlordId),
            ],
            'payment_method' => ['nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', $parentRule],
            'is_installment' => ['boolean'],
            'installment_number' => ['nullable', 'integer', 'min:1'],
            'total_installments' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['pending', 'completed', 'cancelled', 'overdue', 'partial'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->boolean('is_installment')) {
                if (! $this->filled('parent_id')) {
                    $validator->errors()->add('parent_id', 'Installment records must reference a parent financial record.');
                }

                if (! $this->filled('installment_number')) {
                    $validator->errors()->add('installment_number', 'Installment records require an installment number.');
                }

                if (! $this->filled('total_installments')) {
                    $validator->errors()->add('total_installments', 'Installment records require total installments.');
                }
            }
        });
    }
}

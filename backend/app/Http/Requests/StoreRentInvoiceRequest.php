<?php

namespace App\Http\Requests;

use App\Models\RentInvoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRentInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', RentInvoice::class) ?? false;
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
            'invoice_number' => ['nullable', 'string', 'max:100', Rule::unique('rent_invoices', 'invoice_number')->where('landlord_id', $landlordId)->ignore($this->route('rent_invoice'))],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'],
            'rent_amount' => ['required', 'numeric', 'min:0'],
            'late_fee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['generated', 'sent', 'paid', 'overdue', 'cancelled'])],
            'paid_date' => ['nullable', 'date'],
            'payment_method' => ['nullable', Rule::exists('payment_methods', 'name')->where('is_active', true)],
        ];
    }
}
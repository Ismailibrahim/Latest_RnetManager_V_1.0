<?php

namespace App\Http\Requests;

use App\Models\RentInvoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkStoreRentInvoiceRequest extends FormRequest
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
        return [
            'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'],
            'late_fee' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['generated', 'sent', 'paid', 'overdue', 'cancelled'])],
            'skip_existing' => ['nullable', 'boolean'],
        ];
    }
}


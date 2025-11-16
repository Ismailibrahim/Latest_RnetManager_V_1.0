<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSystemSettingsRequest extends FormRequest
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
            'company' => ['sometimes', 'array'],
            'company.name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company.address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'company.city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'company.country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'company.tax_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'company.registration_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'company.phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'company.email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'company.website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'company.logo_url' => ['sometimes', 'nullable', 'url', 'max:500'],

            'currency' => ['sometimes', 'array'],
            'currency.primary' => ['sometimes', 'nullable', 'string', 'max:3'],
            'currency.secondary' => ['sometimes', 'nullable', 'string', 'max:3'],
            'currency.exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            'invoice_numbering' => ['sometimes', 'array'],
            'invoice_numbering.rent_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.maintenance_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.financial_record_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.maintenance_request_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.subscription_invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.receipt_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.refund_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'invoice_numbering.format' => ['sometimes', 'nullable', 'string', 'max:50'],
            'invoice_numbering.reset_monthly' => ['sometimes', 'boolean'],

            'payment_terms' => ['sometimes', 'array'],
            'payment_terms.default_due_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
            'payment_terms.late_fee_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'payment_terms.late_fee_fixed' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'payment_terms.grace_period_days' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:30'],

            'system' => ['sometimes', 'array'],
            'system.timezone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'system.date_format' => ['sometimes', 'nullable', 'string', 'max:20'],
            'system.time_format' => ['sometimes', 'nullable', 'string', 'in:12h,24h'],
            'system.locale' => ['sometimes', 'nullable', 'string', 'max:10'],

            'documents' => ['sometimes', 'array'],
            'documents.retention_years' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'documents.export_format' => ['sometimes', 'nullable', 'string', 'in:csv,excel,pdf'],
            'documents.auto_export' => ['sometimes', 'boolean'],
            'documents.export_email' => ['sometimes', 'nullable', 'email', 'max:255'],

            'tax' => ['sometimes', 'array'],
            'tax.gst_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'tax.gst_enabled' => ['sometimes', 'boolean'],
            'tax.gst_registration_number' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}


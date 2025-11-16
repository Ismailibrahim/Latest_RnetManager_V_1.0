<?php

namespace App\Http\Requests;

use App\Models\TenantUnit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', TenantUnit::class) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $tenantRule = Rule::exists('tenants', 'id')
            ->where('landlord_id', $landlordId);

        $unitRule = Rule::exists('units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'tenant_id' => ['required', 'integer', $tenantRule],
            'unit_id' => ['required', 'integer', $unitRule],
            'lease_start' => ['required', 'date'],
            'lease_end' => ['required', 'date', 'after:lease_start'],
            'monthly_rent' => ['required', 'numeric', 'min:0'],
            'security_deposit_paid' => ['required', 'numeric', 'min:0'],
            'advance_rent_months' => ['nullable', 'integer', 'min:0'],
            'advance_rent_amount' => ['nullable', 'numeric', 'min:0'],
            'notice_period_days' => ['nullable', 'integer', 'min:0'],
            'lock_in_period_months' => ['nullable', 'integer', 'min:0'],
            'lease_document_path' => ['nullable', 'string', 'max:500'],
            'lease_document' => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
            'status' => ['nullable', Rule::in(['active', 'ended', 'cancelled'])],
        ];
    }
}

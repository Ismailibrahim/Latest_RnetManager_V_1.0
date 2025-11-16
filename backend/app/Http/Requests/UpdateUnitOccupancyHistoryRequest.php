<?php

namespace App\Http\Requests;

use App\Models\UnitOccupancyHistory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitOccupancyHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $history = $this->route('unit_occupancy_history');

        if (! $history instanceof UnitOccupancyHistory) {
            return false;
        }

        return $this->user()?->can('update', $history) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $landlordId = $this->user()?->landlord_id;

        $unitRule = Rule::exists('units', 'id')->where('landlord_id', $landlordId);
        $tenantRule = Rule::exists('tenants', 'id')->where('landlord_id', $landlordId);
        $tenantUnitRule = Rule::exists('tenant_units', 'id')
            ->where('landlord_id', $landlordId);

        return [
            'unit_id' => ['sometimes', 'required', 'integer', $unitRule],
            'tenant_id' => ['sometimes', 'required', 'integer', $tenantRule],
            'tenant_unit_id' => ['sometimes', 'required', 'integer', $tenantUnitRule],
            'action' => ['sometimes', 'required', Rule::in(['move_in', 'move_out'])],
            'action_date' => ['sometimes', 'required', 'date'],
            'rent_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'security_deposit_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'lease_start_date' => ['sometimes', 'nullable', 'date'],
            'lease_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:lease_start_date'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $tenantUnitId = $this->input('tenant_unit_id');
            $tenantId = $this->input('tenant_id');
            $unitId = $this->input('unit_id');

            if ($tenantUnitId && ($tenantId || $unitId)) {
                $query = \App\Models\TenantUnit::query()->where('id', $tenantUnitId);

                if ($tenantId) {
                    $query->where('tenant_id', $tenantId);
                }

                if ($unitId) {
                    $query->where('unit_id', $unitId);
                }

                if (! $query->exists()) {
                    $validator->errors()->add('tenant_unit_id', 'tenant_unit_id must align with provided tenant/unit.');
                }
            }
        });
    }
}

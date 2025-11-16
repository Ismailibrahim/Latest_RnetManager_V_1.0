<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\EndLeaseRequest;
use App\Http\Requests\StoreTenantUnitRequest;
use App\Http\Requests\UpdateTenantUnitRequest;
use App\Http\Resources\TenantUnitResource;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class TenantUnitController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', TenantUnit::class);

        $perPage = $this->resolvePerPage($request);

        $query = TenantUnit::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with(['unit:id,unit_number,property_id', 'unit.property:id,name', 'tenant:id,full_name'])
            ->latest();

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $leases = $query
            ->paginate($perPage)
            ->withQueryString();

        return TenantUnitResource::collection($leases);
    }

    public function store(StoreTenantUnitRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;
        $data['status'] = $data['status'] ?? 'active';

        if (array_key_exists('lease_document_path', $data)) {
            $data['lease_document_path'] = $data['lease_document_path']
                ? trim((string) $data['lease_document_path'])
                : null;
        }

        if ($request->hasFile('lease_document')) {
            /** @var UploadedFile $file */
            $file = $request->file('lease_document');
            $tenantId = $data['tenant_id'] ?? null;
            $disk = config('filesystems.default', 'local');
            $directory = $tenantId ? "tenants/{$tenantId}/leases" : 'tenant-leases';
            $data['lease_document_path'] = $file->store($directory, $disk);
        }

        unset($data['lease_document']);

        $tenantUnit = TenantUnit::create($data);
        $tenantUnit->load(['unit:id,unit_number,property_id', 'unit.property:id,name', 'tenant:id,full_name']);

        $this->syncUnitOccupancy($tenantUnit->unit);

        return TenantUnitResource::make($tenantUnit)
            ->response()
            ->setStatusCode(201);
    }

    public function show(TenantUnit $tenantUnit)
    {
        $this->authorize('view', $tenantUnit);

        $tenantUnit->load(['unit:id,unit_number,property_id', 'unit.property:id,name', 'tenant:id,full_name']);

        return TenantUnitResource::make($tenantUnit);
    }

    public function update(UpdateTenantUnitRequest $request, TenantUnit $tenantUnit)
    {
        $validated = $request->validated();

        if (array_key_exists('lease_document_path', $validated)) {
            $validated['lease_document_path'] = $validated['lease_document_path']
                ? trim((string) $validated['lease_document_path'])
                : null;
        }

        if ($request->hasFile('lease_document')) {
            /** @var UploadedFile $file */
            $file = $request->file('lease_document');
            $tenantId = $validated['tenant_id'] ?? $tenantUnit->tenant_id;
            $disk = config('filesystems.default', 'local');
            $directory = $tenantId ? "tenants/{$tenantId}/leases" : 'tenant-leases';
            $validated['lease_document_path'] = $file->store($directory, $disk);
        }

        unset($validated['lease_document']);

        if (! empty($validated)) {
            $tenantUnit->update($validated);
        }

        $tenantUnit->load(['unit:id,unit_number,property_id', 'unit.property:id,name', 'tenant:id,full_name']);

        $this->syncUnitOccupancy($tenantUnit->unit);

        return TenantUnitResource::make($tenantUnit);
    }

    public function destroy(TenantUnit $tenantUnit)
    {
        $this->authorize('delete', $tenantUnit);

        $unit = $tenantUnit->unit;

        $tenantUnit->delete();

        $this->syncUnitOccupancy($unit);

        return response()->noContent();
    }

    public function endLease(EndLeaseRequest $request, TenantUnit $tenantUnit): JsonResponse
    {
        $validated = $request->validated();
        $moveOutDate = $validated['move_out_date'] ?? now()->toDateString();
        $notes = $validated['notes'] ?? null;

        return DB::transaction(function () use ($tenantUnit, $moveOutDate, $notes) {
            $unit = $tenantUnit->unit;
            $tenant = $tenantUnit->tenant;

            // Update lease end date if move-out date is before original lease_end
            $updateData = ['status' => 'ended'];
            if ($tenantUnit->lease_end && $moveOutDate < $tenantUnit->lease_end->toDateString()) {
                $updateData['lease_end'] = $moveOutDate;
            }

            $tenantUnit->update($updateData);

            // Create move-out history record
            UnitOccupancyHistory::create([
                'unit_id' => $tenantUnit->unit_id,
                'tenant_id' => $tenantUnit->tenant_id,
                'tenant_unit_id' => $tenantUnit->id,
                'action' => 'move_out',
                'action_date' => $moveOutDate,
                'rent_amount' => $tenantUnit->monthly_rent,
                'security_deposit_amount' => $tenantUnit->security_deposit_paid,
                'lease_start_date' => $tenantUnit->lease_start,
                'lease_end_date' => $tenantUnit->lease_end,
                'notes' => $notes,
            ]);

            // Update unit occupancy status
            $this->syncUnitOccupancy($unit);

            // Update tenant status to 'former' if no other active leases exist
            $hasActiveLeases = $tenant->tenantUnits()
                ->where('status', 'active')
                ->exists();

            if (! $hasActiveLeases && $tenant->status !== 'former') {
                $tenant->update(['status' => 'former']);
            }

            $tenantUnit->load(['unit:id,unit_number,property_id', 'unit.property:id,name', 'tenant:id,full_name']);

            return TenantUnitResource::make($tenantUnit);
        });
    }

    protected function syncUnitOccupancy(?Unit $unit): void
    {
        if (! $unit) {
            return;
        }

        $unit->update([
            'is_occupied' => $unit->tenantUnits()
                ->where('status', 'active')
                ->exists(),
        ]);
    }
}

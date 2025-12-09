<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\EndLeaseRequest;
use App\Http\Requests\StoreAdvanceRentRequest;
use App\Http\Requests\StoreTenantUnitRequest;
use App\Http\Requests\UpdateTenantUnitRequest;
use App\Http\Resources\TenantUnitResource;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use App\Services\AdvanceRentService;
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
        // Check database connection
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            Log::error('Database connection failed in TenantUnitController', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Database connection failed. Please check your database configuration.',
                'error' => 'Database connection error',
            ], 500);
        }

        $this->authorize('viewAny', TenantUnit::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = TenantUnit::query();

        // Super admins can view all tenant units, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        $query->with([
            'unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency,rent_amount,is_occupied',
            'unit.property:id,name',
            'tenant:id,full_name,email,phone'
        ])
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

        // Paginate without withQueryString to avoid potential issues
        $leases = $query->paginate($perPage);

        return TenantUnitResource::collection($leases);
    }

    public function store(StoreTenantUnitRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id when creating tenant units
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating tenant units.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request);
        $data['status'] = $data['status'] ?? 'active';

        // Set currency from unit if not provided
        if (!isset($data['currency']) && isset($data['unit_id'])) {
            $unit = Unit::find($data['unit_id']);
            if ($unit && $unit->currency) {
                $data['currency'] = $unit->currency;
            } else {
                $data['currency'] = 'MVR'; // Default fallback
            }
        } elseif (!isset($data['currency'])) {
            $data['currency'] = 'MVR'; // Default fallback
        }

        // Default security_deposit_paid to 0 if not provided
        // This field should only be updated when actual payments are collected
        if (!isset($data['security_deposit_paid']) || $data['security_deposit_paid'] === null || $data['security_deposit_paid'] === '') {
            $data['security_deposit_paid'] = 0;
        }

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
        $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

        $this->syncUnitOccupancy($tenantUnit->unit);

        return TenantUnitResource::make($tenantUnit)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, TenantUnit $tenantUnit)
    {
        $this->authorize('view', $tenantUnit);

        $user = $request->user();

        // Ensure tenant unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any tenant unit
        if (!$user->isSuperAdmin() && $tenantUnit->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this tenant unit.');
        }

        $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

        return TenantUnitResource::make($tenantUnit);
    }

    public function update(UpdateTenantUnitRequest $request, TenantUnit $tenantUnit)
    {
        $this->authorize('update', $tenantUnit);

        $user = $request->user();

        // Ensure tenant unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any tenant unit
        if (!$user->isSuperAdmin() && $tenantUnit->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this tenant unit.');
        }

        $validated = $request->validated();

        // If tenant_id or unit_id is being updated, verify they belong to the same landlord
        // Super admins can update to any tenant/unit
        if (!$user->isSuperAdmin()) {
            $landlordId = $user->landlord_id;
            if (isset($validated['tenant_id']) && $validated['tenant_id'] !== $tenantUnit->tenant_id) {
                $tenant = \App\Models\Tenant::where('id', $validated['tenant_id'])
                    ->where('landlord_id', $landlordId)
                    ->first();
                if (! $tenant) {
                    return response()->json([
                        'message' => 'The selected tenant does not belong to your landlord account.',
                        'errors' => ['tenant_id' => ['Invalid tenant selected.']],
                    ], 422);
                }
            }

            if (isset($validated['unit_id']) && $validated['unit_id'] !== $tenantUnit->unit_id) {
                $unit = \App\Models\Unit::where('id', $validated['unit_id'])
                    ->where('landlord_id', $landlordId)
                    ->first();
                if (! $unit) {
                    return response()->json([
                        'message' => 'The selected unit does not belong to your landlord account.',
                        'errors' => ['unit_id' => ['Invalid unit selected.']],
                    ], 422);
                }
            }
        }

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

        $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

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

            $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

            return TenantUnitResource::make($tenantUnit);
        });
    }

    public function collectAdvanceRent(StoreAdvanceRentRequest $request, TenantUnit $tenantUnit): JsonResponse
    {
        $validated = $request->validated();

        // Load unit with currency before collecting advance rent
        $tenantUnit->loadMissing(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency']);

        $advanceRentService = app(AdvanceRentService::class);

        $result = $advanceRentService->collectAdvanceRent(
            tenantUnit: $tenantUnit,
            months: $validated['advance_rent_months'],
            amount: (float) $validated['advance_rent_amount'],
            transactionDate: $validated['transaction_date'],
            currency: $validated['currency'] ?? $tenantUnit->unit->currency ?? 'MVR',
            paymentMethod: $validated['payment_method'] ?? null,
            referenceNumber: $validated['reference_number'] ?? null,
            notes: $validated['notes'] ?? null
        );

        $tenantUnit = $result['tenant_unit'];
        $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

        return TenantUnitResource::make($tenantUnit)
            ->response()
            ->setStatusCode(200);
    }

    public function retroactivelyApplyAdvanceRent(Request $request, TenantUnit $tenantUnit): JsonResponse
    {
        $this->authorize('update', $tenantUnit);

        $user = $request->user();

        // Ensure tenant unit belongs to authenticated user's landlord
        // Super admins can access any tenant unit
        if (!$user->isSuperAdmin() && $tenantUnit->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this tenant unit.');
        }

        // Check if advance rent exists
        if (!$tenantUnit->advance_rent_months || $tenantUnit->advance_rent_months <= 0) {
            return response()->json([
                'message' => 'No advance rent found for this tenant unit.',
                'processed' => 0,
                'applied' => 0.0,
                'invoices' => [],
            ], 400);
        }

        $advanceRentService = app(AdvanceRentService::class);
        $result = $advanceRentService->retroactivelyApplyAdvanceRent($tenantUnit);

        $tenantUnit->load(['unit:id,unit_number,property_id,currency,security_deposit,security_deposit_currency', 'unit.property:id,name', 'tenant:id,full_name']);

        return response()->json([
            'message' => sprintf(
                'Retroactively applied advance rent to %d invoice(s). Total amount applied: %s',
                $result['processed'],
                number_format($result['applied'], 2)
            ),
            'processed' => $result['processed'],
            'applied' => $result['applied'],
            'invoices' => $result['invoices'],
            'tenant_unit' => TenantUnitResource::make($tenantUnit),
        ], 200);
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

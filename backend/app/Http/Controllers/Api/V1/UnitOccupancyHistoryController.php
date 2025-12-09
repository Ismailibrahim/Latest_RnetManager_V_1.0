<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnitOccupancyHistoryRequest;
use App\Http\Requests\UpdateUnitOccupancyHistoryRequest;
use App\Http\Resources\UnitOccupancyHistoryResource;
use App\Models\UnitOccupancyHistory;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitOccupancyHistoryController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', UnitOccupancyHistory::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = UnitOccupancyHistory::query();

        // Super admins can view all unit occupancy history, others only their landlord's (through unit relationship)
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->whereHas('unit', function ($q) use ($landlordId): void {
                $q->where('landlord_id', $landlordId);
            });
        }

        $query->with(['unit:id,unit_number,property_id', 'tenant:id,full_name', 'tenantUnit:id,tenant_id,unit_id,lease_start,lease_end,status'])
            ->latest('action_date');

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('action_date', [$request->input('from'), $request->input('to')]);
        }

        // Paginate without withQueryString to avoid potential issues
        $history = $query->paginate($perPage);

        return UnitOccupancyHistoryResource::collection($history);
    }

    public function store(StoreUnitOccupancyHistoryRequest $request): JsonResponse
    {
        $this->authorize('create', UnitOccupancyHistory::class);

        $history = UnitOccupancyHistory::create($request->validated());

        $history->load(['unit:id,unit_number,property_id', 'tenant:id,full_name', 'tenantUnit:id,tenant_id,unit_id,lease_start,lease_end,status']);

        return UnitOccupancyHistoryResource::make($history)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, UnitOccupancyHistory $unitOccupancyHistory)
    {
        $this->authorize('view', $unitOccupancyHistory);

        $user = $request->user();

        // Ensure unit occupancy history's unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any unit occupancy history
        if (!$user->isSuperAdmin()) {
            $unitOccupancyHistory->load('unit');
            if (! $unitOccupancyHistory->unit || $unitOccupancyHistory->unit->landlord_id !== $user->landlord_id) {
                abort(403, 'Unauthorized access to this unit occupancy history.');
            }
        }

        $unitOccupancyHistory->load(['unit:id,unit_number,property_id', 'tenant:id,full_name', 'tenantUnit:id,tenant_id,unit_id,lease_start,lease_end,status']);

        return UnitOccupancyHistoryResource::make($unitOccupancyHistory);
    }

    public function update(UpdateUnitOccupancyHistoryRequest $request, UnitOccupancyHistory $unitOccupancyHistory)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $unitOccupancyHistory->update($validated);
        }

        $unitOccupancyHistory->load(['unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return UnitOccupancyHistoryResource::make($unitOccupancyHistory);
    }

    public function destroy(UnitOccupancyHistory $unitOccupancyHistory)
    {
        $this->authorize('delete', $unitOccupancyHistory);

        $unitOccupancyHistory->delete();

        return response()->noContent();
    }
}

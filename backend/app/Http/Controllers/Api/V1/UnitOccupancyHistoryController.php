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

        $query = UnitOccupancyHistory::query()
            ->whereHas('unit', function ($q) use ($request): void {
                $q->where('landlord_id', $request->user()->landlord_id);
            })
            ->with(['unit:id,unit_number,property_id', 'tenant:id,full_name', 'tenantUnit:id,tenant_id,unit_id,lease_start,lease_end,status'])
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

        $history = $query
            ->paginate($perPage)
            ->withQueryString();

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

    public function show(UnitOccupancyHistory $unitOccupancyHistory)
    {
        $this->authorize('view', $unitOccupancyHistory);

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

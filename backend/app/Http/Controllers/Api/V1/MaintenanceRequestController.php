<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceRequest;
use App\Http\Requests\UpdateMaintenanceRequest;
use App\Http\Resources\MaintenanceRequestResource;
use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', MaintenanceRequest::class);

        $perPage = $this->resolvePerPage($request);
        $landlordId = $this->getLandlordId($request);

        $query = MaintenanceRequest::query()
            ->where('landlord_id', $landlordId)
            ->with([
                'unit.property:id,name',
                'unit:id,unit_number,property_id,is_occupied',
                'unit.tenantUnits' => function ($q) {
                    $q->where('status', 'active')
                      ->with('tenant:id,full_name')
                      ->limit(1);
                },
                'asset:id,name'
            ])
            ->latest('maintenance_date');

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('is_billable')) {
            $query->where('is_billable', filter_var($request->input('is_billable'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('maintenance_date_from') && $request->filled('maintenance_date_to')) {
            $query->whereBetween('maintenance_date', [
                $request->input('maintenance_date_from'),
                $request->input('maintenance_date_to'),
            ]);
        }

        $requests = $query
            ->paginate($perPage)
            ->withQueryString();

        return MaintenanceRequestResource::collection($requests);
    }

    public function store(StoreMaintenanceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $this->getLandlordId($request);

        $maintenanceRequest = MaintenanceRequest::create($data);
        $maintenanceRequest->load([
            'unit.property:id,name',
            'unit:id,unit_number,property_id,is_occupied',
            'unit.tenantUnits' => function ($q) {
                $q->where('status', 'active')
                  ->with('tenant:id,full_name')
                  ->limit(1);
            },
            'asset:id,name'
        ]);

        return MaintenanceRequestResource::make($maintenanceRequest)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $this->authorize('view', $maintenanceRequest);

        // Ensure maintenance request belongs to authenticated user's landlord (defense in depth)
        if ($maintenanceRequest->landlord_id !== $request->user()->landlord_id) {
            abort(403, 'Unauthorized access to this maintenance request.');
        }

        $maintenanceRequest->load([
            'unit.property:id,name',
            'unit:id,unit_number,property_id,is_occupied',
            'unit.tenantUnits' => function ($q) {
                $q->where('status', 'active')
                  ->with('tenant:id,full_name')
                  ->limit(1);
            },
            'asset:id,name'
        ]);

        return MaintenanceRequestResource::make($maintenanceRequest);
    }

    public function update(UpdateMaintenanceRequest $request, MaintenanceRequest $maintenanceRequest)
    {
        $this->authorize('update', $maintenanceRequest);

        // Ensure maintenance request belongs to authenticated user's landlord (defense in depth)
        $landlordId = $this->getLandlordId($request);
        if ($maintenanceRequest->landlord_id !== $landlordId) {
            abort(403, 'Unauthorized access to this maintenance request.');
        }

        $validated = $request->validated();

        if (! empty($validated)) {
            $maintenanceRequest->update($validated);
        }

        $maintenanceRequest->load([
            'unit.property:id,name',
            'unit:id,unit_number,property_id,is_occupied',
            'unit.tenantUnits' => function ($q) {
                $q->where('status', 'active')
                  ->with('tenant:id,full_name')
                  ->limit(1);
            },
            'asset:id,name'
        ]);

        return MaintenanceRequestResource::make($maintenanceRequest);
    }

    public function destroy(MaintenanceRequest $maintenanceRequest)
    {
        $this->authorize('delete', $maintenanceRequest);

        $maintenanceRequest->delete();

        return response()->noContent();
    }
}
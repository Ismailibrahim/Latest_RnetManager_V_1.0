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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MaintenanceRequestController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', MaintenanceRequest::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = MaintenanceRequest::query();

        // Super admins can view all maintenance requests, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        $query->with([
                'unit.property:id,name',
                'unit:id,unit_number,property_id,is_occupied,rent_amount',
                'unit.tenantUnits' => function ($q) {
                    $q->where('status', 'active')
                      ->with('tenant:id,full_name,phone')
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
        } elseif ($request->filled('maintenance_date_from')) {
            $query->where('maintenance_date', '>=', $request->input('maintenance_date_from'));
        } elseif ($request->filled('maintenance_date_to')) {
            $query->where('maintenance_date', '<=', $request->input('maintenance_date_to'));
        }

        // Paginate without withQueryString to avoid potential issues
        $requests = $query->paginate($perPage);

        return MaintenanceRequestResource::collection($requests);
    }

    public function store(StoreMaintenanceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id when creating maintenance requests
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating maintenance requests.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request);

        // Handle file upload
        if ($request->hasFile('receipt')) {
            /** @var UploadedFile $file */
            $file = $request->file('receipt');
            $disk = config('filesystems.default', 'public');
            $path = $file->store("maintenance/receipts", $disk);
            $data['receipt_path'] = $path;
        }

        // Remove receipt from data array as it's not a database field
        unset($data['receipt']);

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

        $user = $request->user();

        // Ensure maintenance request belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any maintenance request
        if (!$user->isSuperAdmin() && $maintenanceRequest->landlord_id !== $user->landlord_id) {
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

        $user = $request->user();

        // Ensure maintenance request belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any maintenance request
        if (!$user->isSuperAdmin() && $maintenanceRequest->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this maintenance request.');
        }

        $validated = $request->validated();

        // Handle file upload
        if ($request->hasFile('receipt')) {
            // Delete old receipt if exists
            if ($maintenanceRequest->receipt_path) {
                Storage::disk(config('filesystems.default', 'public'))->delete($maintenanceRequest->receipt_path);
            }

            /** @var UploadedFile $file */
            $file = $request->file('receipt');
            $disk = config('filesystems.default', 'public');
            $path = $file->store("maintenance/receipts", $disk);
            $validated['receipt_path'] = $path;
        }

        // Remove receipt from data array as it's not a database field
        unset($validated['receipt']);

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
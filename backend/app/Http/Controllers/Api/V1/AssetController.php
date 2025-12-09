<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\Unit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Asset::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = Asset::query();

        // Super admins can view all assets, others only their landlord's (through unit relationship)
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->whereHas('unit', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            });
        }

        $query->with(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name'])
            ->latest('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('ownership')) {
            $query->where('ownership', $request->input('ownership'));
        }

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->filled('asset_type_id')) {
            $query->where('asset_type_id', $request->integer('asset_type_id'));
        }

        // Paginate without withQueryString to avoid potential issues
        $assets = $query->paginate($perPage);

        return AssetResource::collection($assets);
    }

    public function store(StoreAssetRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Verify unit belongs to authenticated user's landlord
        // Super admins can create assets for any unit
        if (isset($data['unit_id'])) {
            $unitQuery = Unit::where('id', $data['unit_id']);
            
            if (!$user->isSuperAdmin()) {
                $unitQuery->where('landlord_id', $user->landlord_id);
            }
            
            $unit = $unitQuery->first();

            if (! $unit) {
                return response()->json([
                    'message' => $user->isSuperAdmin() 
                        ? 'The selected unit does not exist.' 
                        : 'The selected unit does not belong to your landlord account.',
                    'errors' => [
                        'unit_id' => ['Invalid unit selected.'],
                    ],
                ], 422);
            }
        }

        $asset = Asset::create($data);
        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Asset $asset)
    {
        $this->authorize('view', $asset);

        $user = $request->user();

        // Ensure asset's unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any asset
        if (!$user->isSuperAdmin()) {
            $asset->load('unit');
            if (! $asset->unit || $asset->unit->landlord_id !== $user->landlord_id) {
                abort(403, 'Unauthorized access to this asset.');
            }
        }

        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset);
    }

    public function update(UpdateAssetRequest $request, Asset $asset)
    {
        $this->authorize('update', $asset);

        $user = $request->user();

        // Ensure current asset's unit belongs to authenticated user's landlord
        // Super admins can update any asset
        if (!$user->isSuperAdmin()) {
            $asset->load('unit');
            if (! $asset->unit || $asset->unit->landlord_id !== $user->landlord_id) {
                abort(403, 'Unauthorized access to this asset.');
            }
        }

        $validated = $request->validated();

        // If unit_id is being updated, verify the new unit belongs to the same landlord
        // Super admins can update to any unit
        if (isset($validated['unit_id']) && $validated['unit_id'] !== $asset->unit_id) {
            $unitQuery = Unit::where('id', $validated['unit_id']);
            
            if (!$user->isSuperAdmin()) {
                $unitQuery->where('landlord_id', $user->landlord_id);
            }
            
            $unit = $unitQuery->first();

            if (! $unit) {
                return response()->json([
                    'message' => $user->isSuperAdmin() 
                        ? 'The selected unit does not exist.' 
                        : 'The selected unit does not belong to your landlord account.',
                    'errors' => [
                        'unit_id' => ['Invalid unit selected.'],
                    ],
                ], 422);
            }
        }

        if (! empty($validated)) {
            $asset->update($validated);
        }

        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset);
    }

    public function destroy(Asset $asset)
    {
        $this->authorize('delete', $asset);

        $asset->delete();

        return response()->noContent();
    }
}

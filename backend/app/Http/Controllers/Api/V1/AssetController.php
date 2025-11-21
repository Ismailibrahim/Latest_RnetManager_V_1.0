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

        $query = Asset::query()
            ->whereHas('unit', function ($q) use ($request) {
                $q->where('landlord_id', $request->user()->landlord_id);
            })
            ->with(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name'])
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

        $assets = $query
            ->paginate($perPage)
            ->withQueryString();

        return AssetResource::collection($assets);
    }

    public function store(StoreAssetRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Verify unit belongs to authenticated user's landlord
        if (isset($data['unit_id'])) {
            $unit = Unit::where('id', $data['unit_id'])
                ->where('landlord_id', $request->user()->landlord_id)
                ->first();

            if (! $unit) {
                return response()->json([
                    'message' => 'The selected unit does not belong to your landlord account.',
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

        // Ensure asset's unit belongs to authenticated user's landlord (defense in depth)
        $asset->load('unit');
        if (! $asset->unit || $asset->unit->landlord_id !== $request->user()->landlord_id) {
            abort(403, 'Unauthorized access to this asset.');
        }

        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset);
    }

    public function update(UpdateAssetRequest $request, Asset $asset)
    {
        $this->authorize('update', $asset);

        // Ensure current asset's unit belongs to authenticated user's landlord
        $asset->load('unit');
        if (! $asset->unit || $asset->unit->landlord_id !== $request->user()->landlord_id) {
            abort(403, 'Unauthorized access to this asset.');
        }

        $validated = $request->validated();

        // If unit_id is being updated, verify the new unit belongs to the same landlord
        if (isset($validated['unit_id']) && $validated['unit_id'] !== $asset->unit_id) {
            $unit = Unit::where('id', $validated['unit_id'])
                ->where('landlord_id', $request->user()->landlord_id)
                ->first();

            if (! $unit) {
                return response()->json([
                    'message' => 'The selected unit does not belong to your landlord account.',
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

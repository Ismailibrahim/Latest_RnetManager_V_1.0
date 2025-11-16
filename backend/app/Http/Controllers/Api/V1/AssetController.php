<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
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

        $asset = Asset::create($data);
        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Asset $asset)
    {
        $this->authorize('view', $asset);

        $asset->load(['assetType:id,name,category', 'unit:id,unit_number,property_id', 'tenant:id,full_name']);

        return AssetResource::make($asset);
    }

    public function update(UpdateAssetRequest $request, Asset $asset)
    {
        $validated = $request->validated();

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

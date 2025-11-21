<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetTypeRequest;
use App\Http\Requests\UpdateAssetTypeRequest;
use App\Http\Resources\AssetTypeResource;
use App\Models\AssetType;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AssetTypeController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', AssetType::class);

        $perPage = $this->resolvePerPage($request, 20);

        $assetTypes = AssetType::query()
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return AssetTypeResource::collection($assetTypes);
    }

    public function store(StoreAssetTypeRequest $request): JsonResponse
    {
        $assetType = AssetType::create($request->validated());

        return AssetTypeResource::make($assetType)
            ->response()
            ->setStatusCode(201);
    }

    public function show(AssetType $assetType)
    {
        $this->authorize('view', $assetType);

        return AssetTypeResource::make($assetType);
    }

    public function update(UpdateAssetTypeRequest $request, AssetType $assetType)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $assetType->update($validated);
        }

        return AssetTypeResource::make($assetType);
    }

    public function destroy(AssetType $assetType)
    {
        $this->authorize('delete', $assetType);

        // Check if there are any assets using this asset type
        $assetsCount = $assetType->assets()->count();
        
        if ($assetsCount > 0) {
            return response()->json([
                'message' => 'Cannot delete asset type. This type is currently being used by ' . $assetsCount . ' asset(s). Please remove or reassign these assets before deleting the type.',
                'errors' => [
                    'asset_type_id' => ['This asset type cannot be deleted because it is in use.'],
                ],
            ], 422);
        }

        $assetType->delete();

        return response()->noContent();
    }
}

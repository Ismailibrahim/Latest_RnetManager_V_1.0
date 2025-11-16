<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePropertyRequest;
use App\Http\Requests\UpdatePropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class PropertyController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Property::class);

        $perPage = $this->resolvePerPage($request);

        $properties = Property::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->withCount('units')
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return PropertyResource::collection($properties);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePropertyRequest $request): JsonResponse
    {
        if ($response = $this->ensurePropertyLimit($request)) {
            return $response;
        }

        $data = $request->validated();

        $property = Property::create([
            'landlord_id' => $request->user()->landlord_id,
            'name' => $data['name'],
            'address' => $data['address'],
            'type' => $data['type'],
        ]);

        return PropertyResource::make($property)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Property $property)
    {
        $this->authorize('view', $property);

        $property->loadCount('units');
        $property->load([
            'landlord:id,company_name',
            'units' => fn ($query) => $query
                ->orderBy('unit_number')
                ->with('unitType:id,name'),
        ]);

        return PropertyResource::make($property);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePropertyRequest $request, Property $property)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $property->update($validated);
        }

        return PropertyResource::make($property->fresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Property $property)
    {
        $this->authorize('delete', $property);

        $property->delete();

        return response()->noContent();
    }

    private function ensurePropertyLimit(Request $request): ?JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unable to identify the authenticated user.',
            ], 401);
        }

        $user->loadMissing('landlord.subscriptionLimit');
        $landlord = $user->landlord;

        if (! $landlord) {
            return response()->json([
                'message' => 'Landlord context is required to create properties.',
            ], 422);
        }

        $limit = $landlord->subscriptionLimit;

        if (! $limit || $limit->max_properties === null) {
            return null;
        }

        $currentCount = $landlord->properties()->count();

        if ($currentCount >= $limit->max_properties) {
            return response()->json([
                'message' => 'Subscription limit reached.',
                'errors' => [
                    'properties' => [
                        'You have reached the maximum number of properties allowed by your subscription tier.',
                    ],
                ],
            ], 422);
        }

        return null;
    }
}

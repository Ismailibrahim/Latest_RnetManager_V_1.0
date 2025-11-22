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
        $user = $request->user();

        $query = Property::query()
            ->withCount('units')
            ->latest();

        // Super admins can view all properties, others only their landlord's
        if (! $user->isSuperAdmin()) {
            $query->where('landlord_id', $user->landlord_id);
        }

        $properties = $query->paginate($perPage)->withQueryString();

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
        $user = $request->user();

        // Super admins must specify landlord_id when creating properties
        if ($user->isSuperAdmin() && ! isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating properties.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $property = Property::create([
            'landlord_id' => $user->isSuperAdmin() ? $data['landlord_id'] : $user->landlord_id,
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
    public function show(Request $request, Property $property)
    {
        $this->authorize('view', $property);

        $user = $request->user();

        // Ensure property belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any property
        if (! $user->isSuperAdmin() && $property->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this property.');
        }

        $property->loadCount('units');
        $property->load([
            'landlord:id,company_name',
            'units' => function ($query) use ($user) {
                // Super admins can view all units, others only their landlord's
                if (! $user->isSuperAdmin()) {
                    $query->where('landlord_id', $user->landlord_id);
                }
                $query->orderBy('unit_number')->with('unitType:id,name');
            },
        ]);

        return PropertyResource::make($property);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePropertyRequest $request, Property $property)
    {
        $this->authorize('update', $property);

        $user = $request->user();

        // Ensure property belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any property
        if (! $user->isSuperAdmin() && $property->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this property.');
        }

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

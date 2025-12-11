<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = max(1, min(1000, (int) ($request->input('per_page', 25))));
        $user = $this->getAuthenticatedUser($request);

        $query = Vendor::query();

        // Super admins can view all vendors, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        if ($request->filled('service_category')) {
            $query->where('service_category', $request->string('service_category'));
        }

        if ($request->filled('is_preferred')) {
            $query->where(
                'is_preferred',
                filter_var($request->input('is_preferred'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        // Paginate without withQueryString to avoid potential issues
        return response()->json(
            $query->paginate($perPage)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'service_category' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_preferred' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'landlord_id' => ['nullable', 'integer', 'exists:landlords,id'],
        ]);

        $user = $request->user();

        // Super admins must specify landlord_id when creating vendors
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating vendors.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $vendor = Vendor::create([
            'landlord_id' => $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request),
            ...array_diff_key($data, ['landlord_id' => '']),
        ]);

        return response()->json($vendor, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        $user = $request->user();

        // Super admins can update any vendor
        if (!$user->isSuperAdmin() && $vendor->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this vendor.');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'service_category' => ['sometimes', 'required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_preferred' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $vendor->fill($data)->save();

        return response()->json($vendor);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Vendor $vendor): JsonResponse
    {
        $user = $request->user();

        // Super admins can delete any vendor
        if (!$user->isSuperAdmin() && $vendor->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this vendor.');
        }

        $vendor->delete();

        return response()->json([], 204);
    }
}



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

        $landlordId = $this->getLandlordId($request);
        $query = Vendor::query()
            ->where('landlord_id', $landlordId)
            ->latest();

        if ($request->filled('service_category')) {
            $query->where('service_category', $request->string('service_category'));
        }

        if ($request->filled('is_preferred')) {
            $query->where(
                'is_preferred',
                filter_var($request->input('is_preferred'), FILTER_VALIDATE_BOOLEAN)
            );
        }

        return response()->json(
            $query->paginate($perPage)->withQueryString()
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
        ]);

        $vendor = Vendor::create([
            'landlord_id' => $this->getLandlordId($request),
            ...$data,
        ]);

        return response()->json($vendor, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        abort_unless($vendor->landlord_id === $request->user()->landlord_id, 403);

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
        abort_unless($vendor->landlord_id === $request->user()->landlord_id, 403);
        $vendor->delete();

        return response()->json([], 204);
    }
}



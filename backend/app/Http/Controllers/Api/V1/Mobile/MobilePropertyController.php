<?php

namespace App\Http\Controllers\Api\V1\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\Mobile\MobilePropertyResource;
use App\Models\Property;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class MobilePropertyController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of properties for mobile app.
     * Supports filtering by single or multiple property IDs.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Property::class);

        $landlordId = $this->getLandlordId($request);
        $query = Property::query()
            ->where('landlord_id', $landlordId)
            ->withCount('units')
            ->latest();

        // Support filtering by single property_id
        if ($request->filled('property_id')) {
            $query->where('id', $request->integer('property_id'));
        }

        // Support filtering by multiple property IDs (comma-separated or array)
        if ($request->filled('property_ids')) {
            $propertyIds = is_array($request->input('property_ids'))
                ? $request->input('property_ids')
                : explode(',', $request->input('property_ids'));

            $propertyIds = array_filter(array_map('intval', $propertyIds));
            if (!empty($propertyIds)) {
                $query->whereIn('id', $propertyIds);
            }
        }

        // For mobile, return all properties (no pagination for simplicity)
        // Can add pagination later if needed
        $properties = $query->get();

        return MobilePropertyResource::collection($properties);
    }
}


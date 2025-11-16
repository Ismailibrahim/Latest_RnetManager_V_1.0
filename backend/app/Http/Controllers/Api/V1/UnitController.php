<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkImportUnitsRequest;
use App\Http\Requests\StoreUnitRequest;
use App\Http\Requests\UpdateUnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;

class UnitController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Unit::class);

        $perPage = $this->resolvePerPage($request);

        $query = Unit::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with([
                'unitType:id,name',
                'property:id,name,landlord_id',
            ])
            ->withCount('assets')
            ->latest();

        if ($request->filled('property_id')) {
            $query->where('property_id', $request->integer('property_id'));
        }

        if ($request->filled('is_occupied')) {
            $query->where('is_occupied', filter_var($request->input('is_occupied'), FILTER_VALIDATE_BOOLEAN));
        }

        $units = $query
            ->paginate($perPage)
            ->withQueryString();

        return UnitResource::collection($units);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUnitRequest $request): JsonResponse
    {
        if ($response = $this->ensureUnitLimit($request)) {
            return $response;
        }

        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;
        $data['is_occupied'] = $data['is_occupied'] ?? false;

        $unit = Unit::create($data);
        $unit->load(['unitType:id,name', 'property:id,name']);
        $unit->loadCount('assets');

        return UnitResource::make($unit)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Unit $unit)
    {
        $this->authorize('view', $unit);

        $unit->load(['unitType:id,name', 'property:id,name']);
        $unit->loadCount('assets');

        return UnitResource::make($unit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUnitRequest $request, Unit $unit)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $validated['landlord_id'] = $request->user()->landlord_id;
            $unit->update($validated);
        }

        $unit->load(['unitType:id,name', 'property:id,name']);
        $unit->loadCount('assets');

        return UnitResource::make($unit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Unit $unit)
    {
        $this->authorize('delete', $unit);

        $unit->delete();

        return response()->noContent();
    }

    /**
     * Bulk import units from CSV data.
     */
    public function bulkImport(BulkImportUnitsRequest $request): JsonResponse
    {
        $this->authorize('create', Unit::class);

        $user = $request->user();
        $landlordId = $user->landlord_id;
        $mode = $request->input('mode', 'create');
        $unitsData = $request->input('units', []);

        // Check subscription limit
        if ($response = $this->ensureUnitLimit($request)) {
            $user->loadMissing('landlord.subscriptionLimit');
            $landlord = $user->landlord;
            $limit = $landlord->subscriptionLimit;
            
            if ($limit && $limit->max_units !== null) {
                $currentCount = $landlord->units()->count();
                $newUnitsCount = count($unitsData);
                
                if ($mode === 'create' && ($currentCount + $newUnitsCount) > $limit->max_units) {
                    return response()->json([
                        'message' => 'Import would exceed subscription limit.',
                        'errors' => [
                            'units' => [
                                "You can only import {$limit->max_units} units total. Currently have {$currentCount}, trying to import {$newUnitsCount}.",
                            ],
                        ],
                    ], 422);
                }
            }
        }

        // Load properties and unit types for name resolution
        $properties = Property::where('landlord_id', $landlordId)->get();
        $unitTypes = UnitType::where('is_active', true)->get();

        $results = [
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach ($unitsData as $index => $unitData) {
                try {
                    // Resolve property_id from name or ID
                    $propertyId = $this->resolvePropertyId($unitData, $properties, $landlordId);
                    if (! $propertyId) {
                        $results['failed']++;
                        $results['errors'][] = [
                            'row' => $index + 1,
                            'unit_number' => $unitData['unit_number'] ?? 'N/A',
                            'errors' => ['Property not found. Provide either property_name or property_id.'],
                        ];
                        continue;
                    }

                    // Resolve unit_type_id from name or ID
                    $unitTypeId = $this->resolveUnitTypeId($unitData, $unitTypes);
                    if (! $unitTypeId) {
                        $results['failed']++;
                        $results['errors'][] = [
                            'row' => $index + 1,
                            'unit_number' => $unitData['unit_number'] ?? 'N/A',
                            'errors' => ['Unit type not found. Provide either unit_type_name or unit_type_id.'],
                        ];
                        continue;
                    }

                    $unitNumber = $unitData['unit_number'];
                    $isOccupied = $unitData['is_occupied'] ?? false;

                    $unitDataToSave = [
                        'property_id' => $propertyId,
                        'landlord_id' => $landlordId,
                        'unit_type_id' => $unitTypeId,
                        'unit_number' => $unitNumber,
                        'rent_amount' => (float) $unitData['rent_amount'],
                        'security_deposit' => isset($unitData['security_deposit']) && $unitData['security_deposit'] !== '' 
                            ? (float) $unitData['security_deposit'] 
                            : null,
                        'is_occupied' => is_bool($isOccupied) ? $isOccupied : filter_var($isOccupied, FILTER_VALIDATE_BOOLEAN),
                    ];

                    if ($mode === 'upsert') {
                        $existingUnit = Unit::where('property_id', $propertyId)
                            ->where('unit_number', $unitNumber)
                            ->where('landlord_id', $landlordId)
                            ->first();

                        if ($existingUnit) {
                            $existingUnit->update($unitDataToSave);
                            $results['updated']++;
                        } else {
                            Unit::create($unitDataToSave);
                            $results['created']++;
                        }
                    } else {
                        Unit::create($unitDataToSave);
                        $results['created']++;
                    }
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $index + 1,
                        'unit_number' => $unitData['unit_number'] ?? 'N/A',
                        'errors' => [$e->getMessage()],
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk import completed.',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Bulk import failed: ' . $e->getMessage(),
                'results' => $results,
            ], 500);
        }
    }

    /**
     * Download CSV template for units import.
     */
    public function downloadTemplate(Request $request): Response
    {
        $this->authorize('viewAny', Unit::class);

        $csv = "property_name,property_id,unit_type_name,unit_type_id,unit_number,rent_amount,security_deposit,is_occupied\n";
        $csv .= "Sunset Apartments,,Studio,,101,5000.00,10000.00,false\n";
        $csv .= ",1,1BHK,,102,7500.00,15000.00,true\n";
        $csv .= "Ocean View,,2BHK,,201,12000.00,24000.00,0\n";
        $csv .= "Beach House,,Studio,,301,8000.00,,1\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="units_import_template.csv"',
        ]);
    }

    /**
     * Resolve property ID from name or ID.
     */
    private function resolvePropertyId(array $unitData, $properties, int $landlordId): ?int
    {
        // Try property_id first
        if (isset($unitData['property_id']) && $unitData['property_id'] !== '') {
            $property = $properties->firstWhere('id', (int) $unitData['property_id']);
            if ($property && $property->landlord_id === $landlordId) {
                return $property->id;
            }
        }

        // Try property_name
        if (isset($unitData['property_name']) && $unitData['property_name'] !== '') {
            $property = $properties->firstWhere('name', $unitData['property_name']);
            if ($property && $property->landlord_id === $landlordId) {
                return $property->id;
            }
        }

        return null;
    }

    /**
     * Resolve unit type ID from name or ID.
     */
    private function resolveUnitTypeId(array $unitData, $unitTypes): ?int
    {
        // Try unit_type_id first
        if (isset($unitData['unit_type_id']) && $unitData['unit_type_id'] !== '') {
            $unitType = $unitTypes->firstWhere('id', (int) $unitData['unit_type_id']);
            if ($unitType && $unitType->is_active) {
                return $unitType->id;
            }
        }

        // Try unit_type_name
        if (isset($unitData['unit_type_name']) && $unitData['unit_type_name'] !== '') {
            $unitType = $unitTypes->firstWhere('name', $unitData['unit_type_name']);
            if ($unitType && $unitType->is_active) {
                return $unitType->id;
            }
        }

        return null;
    }

    private function ensureUnitLimit(Request $request): ?JsonResponse
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
                'message' => 'Landlord context is required to create units.',
            ], 422);
        }

        $limit = $landlord->subscriptionLimit;

        if (! $limit || $limit->max_units === null) {
            return null;
        }

        $currentCount = $landlord->units()->count();

        if ($currentCount >= $limit->max_units) {
            return response()->json([
                'message' => 'Subscription limit reached.',
                'errors' => [
                    'units' => [
                        'You have reached the maximum number of units allowed by your subscription tier.',
                    ],
                ],
            ], 422);
        }

        return null;
    }
}
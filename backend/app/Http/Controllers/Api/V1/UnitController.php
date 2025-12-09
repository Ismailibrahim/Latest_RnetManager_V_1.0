<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkImportUnitsRequest;
use App\Http\Requests\StoreUnitRequest;
use App\Http\Requests\UpdateUnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\Landlord;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UnitController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Check database connection
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            Log::error('Database connection failed in UnitController', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Database connection failed. Please check your database configuration.',
                'error' => 'Database connection error',
            ], 500);
        }

        $this->authorize('viewAny', Unit::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = Unit::query()
            ->with([
                'unitType:id,name',
                'property:id,name,landlord_id',
            ])
            ->withCount('assets')
            ->latest();

        // Super admins can view all units, others only their landlord's
        if (! $user->isSuperAdmin()) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        if ($request->filled('property_id')) {
            $query->where('property_id', $request->integer('property_id'));
        }

        if ($request->filled('is_occupied')) {
            $query->where('is_occupied', filter_var($request->input('is_occupied'), FILTER_VALIDATE_BOOLEAN));
        }

        // Optimize: Select only required columns to reduce memory usage
        // Paginate without withQueryString to avoid potential issues
        $units = $query
            ->select([
                'id', 'property_id', 'landlord_id', 'unit_type_id', 'unit_number',
                'rent_amount', 'currency', 'security_deposit', 'security_deposit_currency',
                'is_occupied', 'created_at', 'updated_at'
            ])
            ->paginate($perPage);

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
        $user = $request->user();

        // Super admins must specify landlord_id when creating units
        if ($user->isSuperAdmin() && ! isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating units.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $user->landlord_id;
        $data['is_occupied'] = $data['is_occupied'] ?? false;
        
        // Ensure currency defaults to MVR if not provided or invalid
        if (!isset($data['currency']) || !in_array(strtoupper($data['currency'] ?? ''), ['MVR', 'USD'], true)) {
            $data['currency'] = 'MVR';
        } else {
            $data['currency'] = strtoupper($data['currency']);
        }
        
        // Ensure security_deposit_currency defaults to rent currency if not provided or invalid
        if (isset($data['security_deposit']) && $data['security_deposit'] !== null) {
            if (!isset($data['security_deposit_currency']) || !in_array(strtoupper($data['security_deposit_currency'] ?? ''), ['MVR', 'USD'], true)) {
                $data['security_deposit_currency'] = $data['currency'] ?? 'MVR';
            } else {
                $data['security_deposit_currency'] = strtoupper($data['security_deposit_currency']);
            }
        }

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
    public function show(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        $user = $request->user();

        // Ensure unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any unit
        if (! $user->isSuperAdmin() && $unit->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this unit.');
        }

        $unit->load(['unitType:id,name', 'property:id,name']);
        $unit->loadCount('assets');

        return UnitResource::make($unit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUnitRequest $request, Unit $unit)
    {
        $this->authorize('update', $unit);

        $user = $request->user();

        // Ensure unit belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any unit
        if (! $user->isSuperAdmin() && $unit->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this unit.');
        }

        $validated = $request->validated();
        
        // Normalize currency to MVR or USD only, default to MVR
        if (isset($validated['currency'])) {
            $currency = strtoupper($validated['currency']);
            if ($currency !== 'MVR' && $currency !== 'USD') {
                $validated['currency'] = 'MVR';
            } else {
                $validated['currency'] = $currency;
            }
        }
        
        // Normalize security_deposit_currency
        if (isset($validated['security_deposit_currency'])) {
            $securityDepositCurrency = strtoupper($validated['security_deposit_currency']);
            if ($securityDepositCurrency !== 'MVR' && $securityDepositCurrency !== 'USD') {
                $validated['security_deposit_currency'] = $validated['currency'] ?? $unit->currency ?? 'MVR';
            } else {
                $validated['security_deposit_currency'] = $securityDepositCurrency;
            }
        }

        // If property_id is being updated, verify it belongs to the same landlord
        // Super admins can update to any property
        if (isset($validated['property_id']) && $validated['property_id'] !== $unit->property_id) {
            $propertyQuery = Property::where('id', $validated['property_id']);
            
            if (! $user->isSuperAdmin()) {
                $propertyQuery->where('landlord_id', $user->landlord_id);
            }
            
            $property = $propertyQuery->first();

            if (! $property) {
                return response()->json([
                    'message' => $user->isSuperAdmin() 
                        ? 'The selected property does not exist.' 
                        : 'The selected property does not belong to your landlord account.',
                    'errors' => [
                        'property_id' => ['Invalid property selected.'],
                    ],
                ], 422);
            }
            
            // If super admin is updating property, ensure landlord_id matches the property's landlord
            if ($user->isSuperAdmin() && isset($validated['landlord_id'])) {
                if ($property->landlord_id !== (int) $validated['landlord_id']) {
                    return response()->json([
                        'message' => 'The property does not belong to the specified landlord.',
                        'errors' => [
                            'property_id' => ['Property and landlord do not match.'],
                        ],
                    ], 422);
                }
            }
        }

        if (! empty($validated)) {
            // Super admins can update landlord_id, others keep their landlord
            if (! $user->isSuperAdmin()) {
                // Regular users cannot change landlord_id
                $validated['landlord_id'] = $user->landlord_id;
            } else {
                // Super admins must provide landlord_id if updating
                if (! isset($validated['landlord_id'])) {
                    $validated['landlord_id'] = $unit->landlord_id; // Keep existing
                }
            }
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

                    // Normalize currency to MVR or USD only, default to MVR
                    $currency = strtoupper($unitData['currency'] ?? 'MVR');
                    if ($currency !== 'MVR' && $currency !== 'USD') {
                        $currency = 'MVR';
                    }
                    
                    // Normalize security deposit currency
                    $securityDepositCurrency = null;
                    if (isset($unitData['security_deposit']) && $unitData['security_deposit'] !== '') {
                        $securityDepositCurrency = strtoupper($unitData['security_deposit_currency'] ?? $currency);
                        if ($securityDepositCurrency !== 'MVR' && $securityDepositCurrency !== 'USD') {
                            $securityDepositCurrency = $currency; // Default to rent currency
                        }
                    }

                    $unitDataToSave = [
                        'property_id' => $propertyId,
                        'landlord_id' => $landlordId,
                        'unit_type_id' => $unitTypeId,
                        'unit_number' => $unitNumber,
                        'rent_amount' => (float) $unitData['rent_amount'],
                        'currency' => $currency,
                        'security_deposit' => isset($unitData['security_deposit']) && $unitData['security_deposit'] !== '' 
                            ? (float) $unitData['security_deposit'] 
                            : null,
                        'security_deposit_currency' => $securityDepositCurrency,
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

        $csv = "property_name,property_id,unit_type_name,unit_type_id,unit_number,rent_amount,currency,security_deposit,security_deposit_currency,is_occupied\n";
        $csv .= "Sunset Apartments,,Studio,,101,5000.00,MVR,10000.00,MVR,false\n";
        $csv .= ",1,1BHK,,102,7500.00,MVR,15000.00,MVR,true\n";
        $csv .= "Ocean View,,2BHK,,201,12000.00,USD,24000.00,USD,0\n";
        $csv .= "Beach House,,Studio,,301,8000.00,MVR,,,1\n";

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

        // For super admins, get landlord_id from request data
        // For regular users, use their own landlord_id
        if ($user->isSuperAdmin()) {
            $landlordId = $request->input('landlord_id');
            
            if (! $landlordId) {
                // Skip limit check if landlord_id not provided yet (validation will catch this)
                return null;
            }

            $landlord = Landlord::with('subscriptionLimit')->find($landlordId);
        } else {
            $user->loadMissing('landlord.subscriptionLimit');
            $landlord = $user->landlord;
        }

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
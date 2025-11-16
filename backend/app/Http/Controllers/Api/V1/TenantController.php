<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkImportTenantsRequest;
use App\Http\Requests\StoreTenantRequest;
use App\Http\Requests\UpdateTenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\Nationality;
use App\Models\Tenant;
use App\Models\TenantDocument;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TenantController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Tenant::class);

        $perPage = $this->resolvePerPage($request);

        $query = Tenant::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with(['nationality:id,name'])
            ->withCount([
                'tenantUnits',
                'assets',
                'occupancyHistory',
            ])
            ->orderBy('full_name');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('full_name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            });
        }

        $tenants = $query
            ->paginate($perPage)
            ->withQueryString();

        return TenantResource::collection($tenants);
    }

    public function store(StoreTenantRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;
        $data['status'] = $data['status'] ?? 'active';

        $tenant = Tenant::create($data);

        return TenantResource::make(
            $tenant->fresh(['nationality', 'documents', 'idProofDocument'])
        )
            ->response()
            ->setStatusCode(201);
    }

    public function show(Tenant $tenant)
    {
        $this->authorize('view', $tenant);

        $tenant->load([
            'tenantUnits' => fn ($query) => $query
                ->where('status', 'active')
                ->with(['unit:id,unit_number,property_id']),
            'documents',
            'idProofDocument',
            'nationality',
        ]);

        return TenantResource::make($tenant);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant)
    {
        $validated = $request->validated();

        $idProofDocumentId = $validated['id_proof_document_id'] ?? null;
        $hasIdProofDocument = array_key_exists('id_proof_document_id', $validated);

        unset($validated['id_proof_document_id']);

        if (! empty($validated)) {
            $tenant->update($validated);
        }

        if ($hasIdProofDocument) {
            if ($idProofDocumentId) {
                $document = TenantDocument::query()
                    ->where('id', $idProofDocumentId)
                    ->where('tenant_id', $tenant->id)
                    ->first();

                if (! $document) {
                    throw ValidationException::withMessages([
                        'id_proof_document_id' => ['The selected document does not belong to this tenant.'],
                    ]);
                }

                $tenant->forceFill(['id_proof_document_id' => $document->id])->save();

                if ($document->category !== 'id_proof') {
                    $document->forceFill(['category' => 'id_proof'])->save();
                }
            } else {
                $tenant->forceFill(['id_proof_document_id' => null])->save();
            }
        }

        return TenantResource::make(
            $tenant->fresh(['nationality', 'documents', 'idProofDocument'])
        );
    }

    public function destroy(Tenant $tenant)
    {
        $this->authorize('delete', $tenant);

        $tenant->loadCount(['tenantUnits', 'assets', 'occupancyHistory']);

        if ($tenant->tenant_units_count > 0) {
            return response()->json([
                'message' => 'This tenant cannot be deleted because they have lease records.',
                'errors' => [
                    'tenant' => ['Tenant has associated lease records.'],
                ],
            ], 409);
        }

        if ($tenant->assets_count > 0) {
            return response()->json([
                'message' => 'This tenant cannot be deleted because assets are linked to them.',
                'errors' => [
                    'tenant' => ['Tenant has associated assets.'],
                ],
            ], 409);
        }

        if ($tenant->occupancy_history_count > 0) {
            return response()->json([
                'message' => 'This tenant cannot be deleted because occupancy history exists.',
                'errors' => [
                    'tenant' => ['Tenant has associated occupancy history records.'],
                ],
            ], 409);
        }

        $tenant->delete();

        return response()->noContent();
    }

    /**
     * Bulk import tenants from CSV data.
     */
    public function bulkImport(BulkImportTenantsRequest $request): JsonResponse
    {
        $this->authorize('create', Tenant::class);

        $user = $request->user();
        $landlordId = $user->landlord_id;
        $mode = $request->input('mode', 'create');
        $tenantsData = $request->input('tenants', []);

        // Load nationalities for name resolution
        $nationalities = Nationality::all();

        $results = [
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach ($tenantsData as $index => $tenantData) {
                try {
                    // Resolve nationality_id from name or ID
                    $nationalityId = $this->resolveNationalityId($tenantData, $nationalities);
                    
                    // If nationality_id was provided but not found, add error
                    if (isset($tenantData['nationality_id']) && 
                        $tenantData['nationality_id'] !== '' && 
                        $nationalityId === null) {
                        $results['failed']++;
                        $results['errors'][] = [
                            'row' => $index + 1,
                            'full_name' => $tenantData['full_name'] ?? 'N/A',
                            'errors' => [
                                "Nationality with ID '{$tenantData['nationality_id']}' not found. " .
                                "Please check the ID or use nationality_name instead."
                            ],
                        ];
                        continue;
                    }
                    
                    // If nationality_name was provided but not found, add error
                    if (isset($tenantData['nationality_name']) && 
                        $tenantData['nationality_name'] !== '' && 
                        !isset($tenantData['nationality_id']) &&
                        $nationalityId === null) {
                        $results['failed']++;
                        $results['errors'][] = [
                            'row' => $index + 1,
                            'full_name' => $tenantData['full_name'] ?? 'N/A',
                            'errors' => [
                                "Nationality '{$tenantData['nationality_name']}' not found. " .
                                "Available nationalities: " . 
                                $nationalities->take(10)->pluck('name')->implode(', ') . 
                                ($nationalities->count() > 10 ? '...' : '')
                            ],
                        ];
                        continue;
                    }
                    
                    // For upsert mode, find existing tenant by email or phone
                    $existingTenant = null;
                    if ($mode === 'upsert') {
                        if (!empty($tenantData['email'])) {
                            $existingTenant = Tenant::where('landlord_id', $landlordId)
                                ->where('email', $tenantData['email'])
                                ->first();
                        }
                        
                        if (!$existingTenant && !empty($tenantData['phone'])) {
                            $existingTenant = Tenant::where('landlord_id', $landlordId)
                                ->where('phone', $tenantData['phone'])
                                ->first();
                        }
                    }

                    $tenantDataToSave = [
                        'landlord_id' => $landlordId,
                        'full_name' => $tenantData['full_name'],
                        'email' => $tenantData['email'] ?? null,
                        'phone' => $tenantData['phone'],
                        'alternate_phone' => $tenantData['alternate_phone'] ?? null,
                        'emergency_contact_name' => $tenantData['emergency_contact_name'] ?? null,
                        'emergency_contact_phone' => $tenantData['emergency_contact_phone'] ?? null,
                        'emergency_contact_relationship' => $tenantData['emergency_contact_relationship'] ?? null,
                        'nationality_id' => $nationalityId,
                        'id_proof_type' => $tenantData['id_proof_type'] ?? null,
                        'id_proof_number' => $tenantData['id_proof_number'] ?? null,
                        'status' => $tenantData['status'] ?? 'active',
                    ];

                    if ($existingTenant) {
                        $existingTenant->update($tenantDataToSave);
                        $results['updated']++;
                    } else {
                        Tenant::create($tenantDataToSave);
                        $results['created']++;
                    }
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'row' => $index + 1,
                        'full_name' => $tenantData['full_name'] ?? 'N/A',
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
     * Download CSV template for tenants import.
     */
    public function downloadTemplate(Request $request): Response
    {
        $this->authorize('viewAny', Tenant::class);

        $csv = "full_name,email,phone,alternate_phone,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,nationality_name,nationality_id,id_proof_type,id_proof_number,status\n";
        $csv .= "Ahmed Hassan,ahmed@example.com,+9601234567,+9609876543,Mariyam Hassan,+9601111111,Spouse,Maldivian,,national_id,A123456,active\n";
        $csv .= "Fatima Ali,fatima@example.com,+9602345678,,,Sibling,,32,passport,P987654,active\n";
        $csv .= "Mohamed Ibrahim,,+9603456789,+9602222222,,,Parent,Sri Lanka,,national_id,N456789,inactive\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tenants_import_template.csv"',
        ]);
    }

    /**
     * Resolve nationality ID from name or ID.
     */
    private function resolveNationalityId(array $tenantData, $nationalities): ?int
    {
        // Try nationality_id first
        if (isset($tenantData['nationality_id']) && $tenantData['nationality_id'] !== '') {
            $id = (int) $tenantData['nationality_id'];
            foreach ($nationalities as $nationality) {
                if ($nationality->id === $id) {
                    return $nationality->id;
                }
            }
        }

        // Try nationality_name (case-insensitive, trimmed)
        if (isset($tenantData['nationality_name']) && $tenantData['nationality_name'] !== '') {
            $searchName = trim((string) $tenantData['nationality_name']);
            $searchNameLower = strtolower($searchName);
            
            // Extract root word for better matching (e.g., "maldive" from "maldivian" or "maldives")
            $searchRoot = $this->extractRootWord($searchNameLower);
            
            // Exact match (case-insensitive)
            foreach ($nationalities as $nationality) {
                $name = trim((string) ($nationality->name ?? ''));
                $nameLower = strtolower($name);
                
                // Direct match
                if ($nameLower === $searchNameLower) {
                    return $nationality->id;
                }
                
                // Root word match (handles "Maldivian" vs "Maldives")
                $nameRoot = $this->extractRootWord($nameLower);
                if ($nameRoot && $searchRoot && $nameRoot === $searchRoot) {
                    return $nationality->id;
                }
            }
            
            // Partial match (contains, case-insensitive)
            foreach ($nationalities as $nationality) {
                $name = trim((string) ($nationality->name ?? ''));
                $nameLower = strtolower($name);
                
                if (stripos($name, $searchName) !== false || 
                    stripos($searchName, $name) !== false ||
                    stripos($nameLower, $searchNameLower) !== false ||
                    stripos($searchNameLower, $nameLower) !== false) {
                    return $nationality->id;
                }
                
                // Root word partial match
                if ($searchRoot && stripos($nameLower, $searchRoot) !== false) {
                    return $nationality->id;
                }
            }
        }

        return null;
    }

    /**
     * Extract root word from nationality name for better matching.
     * Handles variations like "Maldivian" -> "maldive", "Maldives" -> "maldive"
     */
    private function extractRootWord(string $name): ?string
    {
        $name = trim(strtolower($name));
        
        // Remove common suffixes
        $name = preg_replace('/\s*(ian|ese|ish|an|ic|i)$/i', '', $name);
        $name = preg_replace('/\s+(nationality|country|nation)$/i', '', $name);
        
        // Special cases
        if (stripos($name, 'maldive') !== false) {
            return 'maldive';
        }
        
        return $name ?: null;
    }
}

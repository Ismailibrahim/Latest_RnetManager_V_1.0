<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFinancialRecordRequest;
use App\Http\Requests\UpdateFinancialRecordRequest;
use App\Http\Resources\FinancialRecordResource;
use App\Models\FinancialRecord;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FinancialRecordController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        // Check database connection
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            Log::error('Database connection failed in FinancialRecordController', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Database connection failed. Please check your database configuration.',
                'error' => 'Database connection error',
            ], 500);
        }

        $this->authorize('viewAny', FinancialRecord::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = FinancialRecord::query();

        // Super admins can view all financial records, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        $query->with([
            'tenantUnit.tenant:id,full_name,email,phone',
            'tenantUnit.unit:id,unit_number,property_id,rent_amount',
            'tenantUnit.unit.property:id,name'
        ])
        ->latest('transaction_date');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('transaction_date', [
                $request->input('from'),
                $request->input('to'),
            ]);
        }

        // Paginate without withQueryString to avoid potential issues
        $records = $query->paginate($perPage);

        return FinancialRecordResource::collection($records);
    }

    public function store(StoreFinancialRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id when creating financial records
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating financial records.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request);

        $record = FinancialRecord::create($data);
        $record->load(['tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number,property_id']);

        return FinancialRecordResource::make($record)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, FinancialRecord $financialRecord)
    {
        $this->authorize('view', $financialRecord);

        $user = $request->user();

        // Ensure financial record belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any financial record
        if (!$user->isSuperAdmin() && $financialRecord->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this financial record.');
        }

        $financialRecord->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'installments',
        ]);

        return FinancialRecordResource::make($financialRecord);
    }

    public function update(UpdateFinancialRecordRequest $request, FinancialRecord $financialRecord)
    {
        $this->authorize('update', $financialRecord);

        $user = $request->user();

        // Ensure financial record belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any financial record
        if (!$user->isSuperAdmin() && $financialRecord->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this financial record.');
        }

        $validated = $request->validated();

        if (! empty($validated)) {
            $financialRecord->update($validated);
        }

        $financialRecord->load(['tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number,property_id']);

        return FinancialRecordResource::make($financialRecord);
    }

    public function destroy(FinancialRecord $financialRecord)
    {
        $this->authorize('delete', $financialRecord);

        $financialRecord->delete();

        return response()->noContent();
    }
}
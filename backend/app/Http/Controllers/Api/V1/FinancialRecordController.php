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

class FinancialRecordController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', FinancialRecord::class);

        $perPage = $this->resolvePerPage($request);

        $query = FinancialRecord::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with(['tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number,property_id'])
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

        $records = $query
            ->paginate($perPage)
            ->withQueryString();

        return FinancialRecordResource::collection($records);
    }

    public function store(StoreFinancialRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;

        $record = FinancialRecord::create($data);
        $record->load(['tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number,property_id']);

        return FinancialRecordResource::make($record)
            ->response()
            ->setStatusCode(201);
    }

    public function show(FinancialRecord $financialRecord)
    {
        $this->authorize('view', $financialRecord);

        $financialRecord->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'installments',
        ]);

        return FinancialRecordResource::make($financialRecord);
    }

    public function update(UpdateFinancialRecordRequest $request, FinancialRecord $financialRecord)
    {
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
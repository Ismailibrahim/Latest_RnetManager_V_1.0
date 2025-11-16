<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceInvoiceRequest;
use App\Http\Requests\UpdateMaintenanceInvoiceRequest;
use App\Http\Resources\MaintenanceInvoiceResource;
use App\Models\MaintenanceInvoice;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceInvoiceController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', MaintenanceInvoice::class);

        $perPage = $this->resolvePerPage($request);

        $query = MaintenanceInvoice::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with([
                'tenantUnit.tenant:id,full_name',
                'tenantUnit.unit:id,unit_number,property_id',
                // Align with actual maintenance_requests schema
                'maintenanceRequest:id,unit_id,description,type,maintenance_date',
            ])
            ->latest('invoice_date');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        if ($request->filled('maintenance_request_id')) {
            $query->where('maintenance_request_id', $request->integer('maintenance_request_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('invoice_date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('invoice_date', '<=', $request->input('to'));
        }

        $invoices = $query
            ->paginate($perPage)
            ->withQueryString();

        return MaintenanceInvoiceResource::collection($invoices);
    }

    public function store(StoreMaintenanceInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;
        // Ensure status aligns with enum ['sent','paid','overdue','cancelled']
        $data['status'] = $data['status'] ?? 'sent';

        $invoice = MaintenanceInvoice::create($data);
        $invoice->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'maintenanceRequest:id,unit_id,description,type,maintenance_date',
        ]);

        return MaintenanceInvoiceResource::make($invoice)
            ->response()
            ->setStatusCode(201);
    }

    public function show(MaintenanceInvoice $maintenanceInvoice)
    {
        $this->authorize('view', $maintenanceInvoice);

        $maintenanceInvoice->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'maintenanceRequest:id,unit_id,description,type,maintenance_date',
        ]);

        return MaintenanceInvoiceResource::make($maintenanceInvoice);
    }

    public function update(UpdateMaintenanceInvoiceRequest $request, MaintenanceInvoice $maintenanceInvoice)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $maintenanceInvoice->update($validated);
        }

        $maintenanceInvoice->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'maintenanceRequest:id,unit_id,description,type,maintenance_date',
        ]);

        return MaintenanceInvoiceResource::make($maintenanceInvoice);
    }

    public function destroy(MaintenanceInvoice $maintenanceInvoice)
    {
        $this->authorize('delete', $maintenanceInvoice);

        $maintenanceInvoice->delete();

        return response()->noContent();
    }
}


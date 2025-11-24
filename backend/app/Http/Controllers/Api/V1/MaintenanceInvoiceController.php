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

        $landlordId = $this->getLandlordId($request);
        $query = MaintenanceInvoice::query()
            ->where('landlord_id', $landlordId)
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
        $data['landlord_id'] = $this->getLandlordId($request);
        // Ensure status aligns with enum ['sent','paid','overdue','cancelled']
        $data['status'] = $data['status'] ?? 'sent';

        // Map cost to labor_cost + parts_cost for database compatibility
        if (isset($data['cost'])) {
            $cost = $data['cost'];
            // Split cost evenly between labor and parts, or put all in parts_cost
            $data['labor_cost'] = 0;
            $data['parts_cost'] = $cost;
            $data['misc_amount'] = 0;
            unset($data['cost']);
        }

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

    public function show(Request $request, MaintenanceInvoice $maintenanceInvoice)
    {
        $this->authorize('view', $maintenanceInvoice);

        // Ensure maintenance invoice belongs to authenticated user's landlord (defense in depth)
        $landlordId = $this->getLandlordId($request);
        if ($maintenanceInvoice->landlord_id !== $landlordId) {
            abort(403, 'Unauthorized access to this maintenance invoice.');
        }

        $maintenanceInvoice->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'maintenanceRequest:id,unit_id,description,type,maintenance_date',
        ]);

        return MaintenanceInvoiceResource::make($maintenanceInvoice);
    }

    public function update(UpdateMaintenanceInvoiceRequest $request, MaintenanceInvoice $maintenanceInvoice)
    {
        $this->authorize('update', $maintenanceInvoice);

        // Ensure maintenance invoice belongs to authenticated user's landlord (defense in depth)
        $landlordId = $this->getLandlordId($request);
        if ($maintenanceInvoice->landlord_id !== $landlordId) {
            abort(403, 'Unauthorized access to this maintenance invoice.');
        }

        $validated = $request->validated();

        // Map cost to labor_cost + parts_cost for database compatibility
        if (isset($validated['cost'])) {
            $cost = $validated['cost'];
            // Split cost evenly between labor and parts, or put all in parts_cost
            $validated['labor_cost'] = 0;
            $validated['parts_cost'] = $cost;
            $validated['misc_amount'] = 0;
            unset($validated['cost']);
        }

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

    /**
     * Manually link recent payments to this invoice if they match.
     * This is a utility to fix payment linking issues.
     */
    public function linkPayments(Request $request, MaintenanceInvoice $maintenanceInvoice)
    {
        $this->authorize('update', $maintenanceInvoice);

        // Find recent payments for this tenant unit that might belong to this invoice
        $recentPayments = \App\Models\UnifiedPaymentEntry::where('tenant_unit_id', $maintenanceInvoice->tenant_unit_id)
            ->whereIn('status', ['completed', 'partial'])
            ->where(function($query) {
                $query->whereNull('source_type')
                      ->orWhere('source_type', '!=', 'maintenance_invoice')
                      ->orWhereNull('source_id');
            })
            ->where('payment_type', 'maintenance_expense')
            ->where('amount', '>=', (float) $maintenanceInvoice->grand_total - 0.01)
            ->latest('id')
            ->take(5)
            ->get();

        $linked = 0;
        foreach ($recentPayments as $payment) {
            if (!$payment->source_type || $payment->source_type !== 'maintenance_invoice' || $payment->source_id != $maintenanceInvoice->id) {
                $payment->source_type = 'maintenance_invoice';
                $payment->source_id = $maintenanceInvoice->id;
                $payment->save();
                $linked++;
            }
        }

        return response()->json([
            'message' => sprintf('Linked %d payment(s) to this invoice', $linked),
            'linked_count' => $linked,
        ]);
    }

    /**
     * Manually sync invoice status based on payments.
     * This is a debug/utility endpoint to fix status issues.
     */
    public function syncStatus(Request $request, MaintenanceInvoice $maintenanceInvoice)
    {
        \Log::info('syncStatus called', [
            'invoice_id' => $maintenanceInvoice->id,
            'invoice_number' => $maintenanceInvoice->invoice_number,
            'current_status' => $maintenanceInvoice->status,
        ]);

        $this->authorize('update', $maintenanceInvoice);

        // Check for payments linked to this invoice
        $payments = \App\Models\UnifiedPaymentEntry::where('source_type', 'maintenance_invoice')
            ->where('source_id', $maintenanceInvoice->id)
            ->whereIn('status', ['completed', 'partial'])
            ->get();

        // Also check for payments with ANY source_id (to see if there are payments that should be linked)
        $allPaymentsForTenantUnit = \App\Models\UnifiedPaymentEntry::where('tenant_unit_id', $maintenanceInvoice->tenant_unit_id)
            ->whereIn('status', ['completed', 'partial'])
            ->latest('id')
            ->take(10)
            ->get();

        \Log::info('All recent payments for tenant unit', [
            'tenant_unit_id' => $maintenanceInvoice->tenant_unit_id,
            'payments' => $allPaymentsForTenantUnit->map(fn($p) => [
                'id' => $p->id,
                'source_type' => $p->source_type,
                'source_id' => $p->source_id,
                'source_id_type' => gettype($p->source_id),
                'amount' => $p->amount,
                'status' => $p->status,
                'payment_type' => $p->payment_type,
                'created_at' => $p->created_at,
            ])->toArray(),
        ]);

        \Log::info('Payments found for invoice', [
            'invoice_id' => $maintenanceInvoice->id,
            'payment_count' => $payments->count(),
            'payments' => $payments->map(fn($p) => [
                'id' => $p->id,
                'source_type' => $p->source_type,
                'source_id' => $p->source_id,
                'amount' => $p->amount,
                'status' => $p->status,
            ])->toArray(),
        ]);

        $totalPaid = $payments->sum('amount');
        $grandTotal = (float) $maintenanceInvoice->grand_total;
        $isFullyPaid = $totalPaid >= $grandTotal - 0.01;

        \Log::info('Payment calculation', [
            'invoice_id' => $maintenanceInvoice->id,
            'total_paid' => $totalPaid,
            'grand_total' => $grandTotal,
            'is_fully_paid' => $isFullyPaid,
            'current_status' => $maintenanceInvoice->status,
        ]);

        if ($isFullyPaid && $maintenanceInvoice->status !== 'paid') {
            $maintenanceInvoice->status = 'paid';
            if (!$maintenanceInvoice->paid_date) {
                $maintenanceInvoice->paid_date = now();
            }
            $maintenanceInvoice->save();

            \Log::info('Invoice status updated to paid', [
                'invoice_id' => $maintenanceInvoice->id,
                'new_status' => $maintenanceInvoice->status,
            ]);

            // Reload to ensure we have the latest data
            $maintenanceInvoice->refresh();

            return response()->json([
                'message' => 'Invoice status updated to paid',
                'invoice' => MaintenanceInvoiceResource::make($maintenanceInvoice),
                'total_paid' => $totalPaid,
                'grand_total' => $grandTotal,
                'is_fully_paid' => true,
            ]);
        }

        return response()->json([
            'message' => $isFullyPaid 
                ? 'Invoice is fully paid but status is already correct' 
                : sprintf('Invoice not fully paid yet. Paid: %s / %s', $totalPaid, $grandTotal),
            'invoice' => MaintenanceInvoiceResource::make($maintenanceInvoice),
            'total_paid' => $totalPaid,
            'grand_total' => $grandTotal,
            'is_fully_paid' => $isFullyPaid,
            'linked_payments_count' => $payments->count(),
            'linked_payments' => $payments->map(fn($p) => [
                'id' => $p->id,
                'source_type' => $p->source_type,
                'source_id' => $p->source_id,
                'amount' => $p->amount,
                'status' => $p->status,
            ])->toArray(),
            'recent_payments' => $allPaymentsForTenantUnit->map(fn($p) => [
                'id' => $p->id,
                'source_type' => $p->source_type,
                'source_id' => $p->source_id,
                'source_id_type' => gettype($p->source_id),
                'amount' => $p->amount,
                'status' => $p->status,
            ])->toArray(),
        ]);
    }
}


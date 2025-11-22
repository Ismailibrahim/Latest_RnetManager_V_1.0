<?php

namespace App\Http\Controllers\Api\V1\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\Mobile\MobileInvoiceResource;
use App\Http\Resources\Mobile\MobileUnitResource;
use App\Models\RentInvoice;
use App\Models\Unit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class MobileUnitController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of units with aggregated data for mobile app.
     * Includes pending/unpaid invoice counts, tenant info, and unit status.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Unit::class);

        $landlordId = $request->user()->landlord_id;

        $query = Unit::query()
            ->where('landlord_id', $landlordId)
            ->with([
                'property:id,name',
                'unitType:id,name',
            ])
            ->latest();

        // Filter by property_id(s)
        if ($request->filled('property_id')) {
            $query->where('property_id', $request->integer('property_id'));
        }

        // Support multiple property IDs
        if ($request->filled('property_ids')) {
            $propertyIds = is_array($request->input('property_ids'))
                ? $request->input('property_ids')
                : explode(',', $request->input('property_ids'));

            $propertyIds = array_filter(array_map('intval', $propertyIds));
            if (!empty($propertyIds)) {
                $query->whereIn('property_id', $propertyIds);
            }
        }

        $units = $query->get();

        // Load tenant units and calculate aggregated data
        $unitIds = $units->pluck('id');
        
        // Get active tenant units for these units
        $tenantUnits = \App\Models\TenantUnit::query()
            ->whereIn('unit_id', $unitIds)
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->with(['tenant:id,full_name,email,phone'])
            ->get()
            ->keyBy('unit_id');

        // Get invoice counts for each unit
        $invoiceCounts = RentInvoice::query()
            ->whereIn('tenant_unit_id', $tenantUnits->pluck('id'))
            ->where('landlord_id', $landlordId)
            ->selectRaw('
                tenant_unit_id,
                COUNT(*) as total_invoices,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as pending_invoices_count,
                SUM(CASE WHEN status NOT IN (?, ?) THEN 1 ELSE 0 END) as unpaid_invoices_count
            ', ['generated', 'sent', 'paid', 'cancelled'])
            ->groupBy('tenant_unit_id')
            ->get()
            ->keyBy('tenant_unit_id');

        // Attach aggregated data to units
        $units->each(function ($unit) use ($tenantUnits, $invoiceCounts) {
            $tenantUnit = $tenantUnits->get($unit->id);
            
            if ($tenantUnit) {
                $unit->setAttribute('current_tenant_unit', $tenantUnit);
                $unit->setAttribute('is_occupied', true);
                
                $invoiceData = $invoiceCounts->get($tenantUnit->id);
                $unit->setAttribute('pending_invoices_count', $invoiceData ? (int) $invoiceData->pending_invoices_count : 0);
                $unit->setAttribute('unpaid_invoices_count', $invoiceData ? (int) $invoiceData->unpaid_invoices_count : 0);
            } else {
                $unit->setAttribute('current_tenant_unit', null);
                $unit->setAttribute('is_occupied', false);
                $unit->setAttribute('pending_invoices_count', 0);
                $unit->setAttribute('unpaid_invoices_count', 0);
            }
        });

        return MobileUnitResource::collection($units);
    }

    /**
     * Display the specified unit with full details.
     */
    public function show(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        // Ensure unit belongs to authenticated user's landlord
        if ($unit->landlord_id !== $request->user()->landlord_id) {
            abort(403, 'Unauthorized access to this unit.');
        }

        $landlordId = $request->user()->landlord_id;

        // Load relationships
        $unit->load([
            'property:id,name,address',
            'unitType:id,name',
        ]);

        // Get current tenant unit if occupied
        $tenantUnit = \App\Models\TenantUnit::query()
            ->where('unit_id', $unit->id)
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->with(['tenant:id,full_name,email,phone'])
            ->first();

        if ($tenantUnit) {
            $unit->setAttribute('current_tenant_unit', $tenantUnit);
            $unit->setAttribute('is_occupied', true);

            // Get invoice counts
            $invoiceData = RentInvoice::query()
                ->where('tenant_unit_id', $tenantUnit->id)
                ->where('landlord_id', $landlordId)
                ->selectRaw('
                    COUNT(*) as total_invoices,
                    SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as pending_invoices_count,
                    SUM(CASE WHEN status NOT IN (?, ?) THEN 1 ELSE 0 END) as unpaid_invoices_count
                ', ['generated', 'sent', 'paid', 'cancelled'])
                ->first();

            $unit->setAttribute('pending_invoices_count', $invoiceData ? (int) $invoiceData->pending_invoices_count : 0);
            $unit->setAttribute('unpaid_invoices_count', $invoiceData ? (int) $invoiceData->unpaid_invoices_count : 0);
        } else {
            $unit->setAttribute('current_tenant_unit', null);
            $unit->setAttribute('is_occupied', false);
            $unit->setAttribute('pending_invoices_count', 0);
            $unit->setAttribute('unpaid_invoices_count', 0);
        }

        return MobileUnitResource::make($unit);
    }

    /**
     * Get invoices for a specific unit.
     */
    public function invoices(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        // Ensure unit belongs to authenticated user's landlord
        if ($unit->landlord_id !== $request->user()->landlord_id) {
            abort(403, 'Unauthorized access to this unit.');
        }

        $landlordId = $request->user()->landlord_id;

        // Get active tenant unit for this unit
        $tenantUnit = \App\Models\TenantUnit::query()
            ->where('unit_id', $unit->id)
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->first();

        if (!$tenantUnit) {
            return response()->json([
                'data' => [],
            ]);
        }

        $query = RentInvoice::query()
            ->where('tenant_unit_id', $tenantUnit->id)
            ->where('landlord_id', $landlordId)
            ->with(['tenantUnit.tenant:id,full_name'])
            ->latest('invoice_date');

        // Filter by status if provided
        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'pending') {
                $query->whereIn('status', ['generated', 'sent']);
            } elseif ($status === 'unpaid') {
                $query->whereNotIn('status', ['paid', 'cancelled']);
            } else {
                $query->where('status', $status);
            }
        }

        $invoices = $query->get();

        return MobileInvoiceResource::collection($invoices);
    }
}


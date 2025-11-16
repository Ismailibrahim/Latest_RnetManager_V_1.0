<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSecurityDepositRefundRequest;
use App\Http\Requests\UpdateSecurityDepositRefundRequest;
use App\Http\Resources\SecurityDepositRefundResource;
use App\Models\SecurityDepositRefund;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityDepositRefundController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', SecurityDepositRefund::class);

        $perPage = $this->resolvePerPage($request);

        $query = SecurityDepositRefund::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with([
                'tenantUnit.tenant:id,full_name',
                'tenantUnit.unit:id,unit_number,property_id',
                'tenantUnit.unit.property:id,name',
            ])
            ->latest('refund_date');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        if ($request->filled('refund_number')) {
            $query->where('refund_number', 'like', '%'.$request->input('refund_number').'%');
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('refund_date', [$request->input('from'), $request->input('to')]);
        }

        $refunds = $query
            ->paginate($perPage)
            ->withQueryString();

        return SecurityDepositRefundResource::collection($refunds);
    }

    public function store(StoreSecurityDepositRefundRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;

        $refund = SecurityDepositRefund::create($data);
        $refund->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'tenantUnit.unit.property:id,name',
        ]);

        return SecurityDepositRefundResource::make($refund)
            ->response()
            ->setStatusCode(201);
    }

    public function show(SecurityDepositRefund $securityDepositRefund)
    {
        $this->authorize('view', $securityDepositRefund);

        $securityDepositRefund->load([
            'tenantUnit.tenant:id,full_name',
            'tenantUnit.unit:id,unit_number,property_id',
            'tenantUnit.unit.property:id,name',
        ]);

        return SecurityDepositRefundResource::make($securityDepositRefund);
    }

    public function update(UpdateSecurityDepositRefundRequest $request, SecurityDepositRefund $securityDepositRefund)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $securityDepositRefund->update($validated);
        }

        $securityDepositRefund->load('tenantUnit:id,tenant_id,unit_id');

        return SecurityDepositRefundResource::make($securityDepositRefund);
    }

    public function destroy(SecurityDepositRefund $securityDepositRefund)
    {
        $this->authorize('delete', $securityDepositRefund);

        $securityDepositRefund->delete();

        return response()->noContent();
    }
}

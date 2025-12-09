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
        $user = $this->getAuthenticatedUser($request);

        $query = SecurityDepositRefund::query();

        // Super admins can view all security deposit refunds, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        $query->with([
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

        // Paginate without withQueryString to avoid potential issues
        $refunds = $query->paginate($perPage);

        return SecurityDepositRefundResource::collection($refunds);
    }

    public function store(StoreSecurityDepositRefundRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id when creating security deposit refunds
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating security deposit refunds.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request);

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

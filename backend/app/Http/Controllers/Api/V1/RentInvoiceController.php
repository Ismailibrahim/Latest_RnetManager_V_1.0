<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStoreRentInvoiceRequest;
use App\Http\Requests\StoreRentInvoiceRequest;
use App\Http\Requests\UpdateRentInvoiceRequest;
use App\Http\Resources\RentInvoiceResource;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use App\Services\AdvanceRentService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Mpdf\Mpdf;

class RentInvoiceController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        // Check database connection
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            Log::error('Database connection failed in RentInvoiceController', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Database connection failed. Please check your database configuration.',
                'error' => 'Database connection error',
            ], 500);
        }

        $this->authorize('viewAny', RentInvoice::class);

        $perPage = $this->resolvePerPage($request);
        $user = $this->getAuthenticatedUser($request);

        $query = RentInvoice::query();

        // Super admins can view all rent invoices, others only their landlord's
        if ($this->shouldFilterByLandlord($request)) {
            $landlordId = $this->getLandlordId($request);
            $query->where('landlord_id', $landlordId);
        }

        $query->with([
                'tenantUnit.tenant:id,full_name,email,phone',
                'tenantUnit.unit:id,unit_number,property_id,rent_amount',
                'tenantUnit.unit.property:id,name'
            ])
            ->latest('invoice_date');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        // Paginate without withQueryString to avoid potential issues
        $invoices = $query->paginate($perPage);

        return RentInvoiceResource::collection($invoices);
    }

    public function store(StoreRentInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id when creating rent invoices
        if ($user->isSuperAdmin() && !isset($data['landlord_id'])) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id when creating rent invoices.',
                'errors' => [
                    'landlord_id' => ['The landlord_id field is required for super admin users.'],
                ],
            ], 422);
        }

        $data['landlord_id'] = $user->isSuperAdmin() ? $data['landlord_id'] : $this->getLandlordId($request);
        $data['status'] = $data['status'] ?? 'generated';
        
        // Initialize advance rent fields
        $data['advance_rent_applied'] = 0.00;
        $data['is_advance_covered'] = false;

        $invoice = RentInvoice::create($data);
        $invoice->load('tenantUnit');

        // Apply advance rent if applicable
        $tenantUnit = $invoice->tenantUnit;
        if ($tenantUnit) {
            $advanceRentService = app(AdvanceRentService::class);
            $advanceRentService->applyAdvanceRentToInvoice($invoice, $tenantUnit);
        }

        $invoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($invoice)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, RentInvoice $rentInvoice)
    {
        $this->authorize('view', $rentInvoice);

        $user = $request->user();

        // Ensure rent invoice belongs to authenticated user's landlord (defense in depth)
        // Super admins can view any rent invoice
        if (!$user->isSuperAdmin() && $rentInvoice->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this rent invoice.');
        }

        $rentInvoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($rentInvoice);
    }

    public function export(Request $request, RentInvoice $rentInvoice)
    {
        $this->authorize('view', $rentInvoice);

        $user = $request->user();

        // Ensure rent invoice belongs to authenticated user's landlord (defense in depth)
        // Super admins can export any rent invoice
        if (!$user->isSuperAdmin() && $rentInvoice->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this rent invoice.');
        }

        $rentInvoice->load([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
        ]);

        $filename = Str::slug($rentInvoice->invoice_number ?? 'rent-invoice') . '.pdf';

        $html = View::make('pdf.rent_invoice', [
            'invoice' => $rentInvoice,
            'tenantUnit' => $rentInvoice->tenantUnit,
            'tenant' => $rentInvoice->tenantUnit?->tenant,
            'unit' => $rentInvoice->tenantUnit?->unit,
            'property' => $rentInvoice->tenantUnit?->unit?->property,
        ])->render();

        $mpdf = new Mpdf([
            'format' => 'A4',
            'mode' => 'utf-8',
            'margin_top' => 15,
            'margin_bottom' => 15,
            'margin_left' => 15,
            'margin_right' => 15,
        ]);

        $mpdf->WriteHTML($html);
        $binary = $mpdf->Output('', 'S');

        return Response::make($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function update(UpdateRentInvoiceRequest $request, RentInvoice $rentInvoice)
    {
        $this->authorize('update', $rentInvoice);

        $user = $request->user();

        // Ensure rent invoice belongs to authenticated user's landlord (defense in depth)
        // Super admins can update any rent invoice
        if (!$user->isSuperAdmin() && $rentInvoice->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this rent invoice.');
        }

        $validated = $request->validated();

        if (! empty($validated)) {
            $rentInvoice->update($validated);
        }

        $rentInvoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($rentInvoice);
    }

    public function destroy(RentInvoice $rentInvoice)
    {
        $this->authorize('delete', $rentInvoice);

        $rentInvoice->delete();

        return response()->noContent();
    }

    public function bulkStore(BulkStoreRentInvoiceRequest $request): JsonResponse
    {
        $this->authorize('create', RentInvoice::class);

        $data = $request->validated();
        $user = $request->user();

        // Super admins must specify landlord_id for bulk generation
        if ($user->isSuperAdmin()) {
            $landlordId = $data['landlord_id'] ?? null;
            if (!$landlordId) {
                return response()->json([
                    'message' => 'Super admin must specify landlord_id for bulk invoice generation.',
                    'errors' => [
                        'landlord_id' => ['The landlord_id field is required for super admin users.'],
                    ],
                ], 422);
            }
        } else {
            $landlordId = $user->landlord_id;
        }

        $skipExisting = $data['skip_existing'] ?? false;

        // Get all active tenant units for this landlord
        $tenantUnits = TenantUnit::query()
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->with(['tenant:id,full_name', 'unit:id,unit_number'])
            ->get();

        if ($tenantUnits->isEmpty()) {
            return response()->json([
                'message' => 'No active tenant units found.',
                'created' => 0,
                'skipped' => 0,
                'failed' => 0,
                'invoices' => [],
            ], 200);
        }

        $created = [];
        $skipped = [];
        $failed = [];
        $advanceRentService = app(AdvanceRentService::class);

        DB::beginTransaction();
        try {
            foreach ($tenantUnits as $tenantUnit) {
                // Check if invoice already exists for this date and tenant unit
                if ($skipExisting) {
                    $existing = RentInvoice::query()
                        ->where('landlord_id', $landlordId)
                        ->where('tenant_unit_id', $tenantUnit->id)
                        ->where('invoice_date', $data['invoice_date'])
                        ->exists();

                    if ($existing) {
                        $skipped[] = [
                            'tenant_unit_id' => $tenantUnit->id,
                            'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                            'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                            'reason' => 'Invoice already exists for this date',
                        ];
                        continue;
                    }
                }

                // Use monthly_rent from tenant unit
                $rentAmount = (float) ($tenantUnit->monthly_rent ?? 0);

                if ($rentAmount <= 0) {
                    $failed[] = [
                        'tenant_unit_id' => $tenantUnit->id,
                        'tenant_name' => $tenantUnit->tenant?->full_name ?? 'Unknown',
                        'unit_number' => $tenantUnit->unit?->unit_number ?? 'Unknown',
                        'reason' => 'Monthly rent is not set or is zero',
                    ];
                    continue;
                }

                // Create invoice data
                $invoiceData = [
                    'tenant_unit_id' => $tenantUnit->id,
                    'landlord_id' => $landlordId,
                    'invoice_date' => $data['invoice_date'],
                    'due_date' => $data['due_date'],
                    'rent_amount' => $rentAmount,
                    'late_fee' => $data['late_fee'] ?? 0,
                    'status' => $data['status'] ?? 'generated',
                    'advance_rent_applied' => 0.00,
                    'is_advance_covered' => false,
                ];

                $invoice = RentInvoice::create($invoiceData);
                $invoice->load('tenantUnit');

                // Apply advance rent if applicable
                if ($tenantUnit) {
                    $advanceRentService->applyAdvanceRentToInvoice($invoice, $tenantUnit);
                }

                $invoice->load('tenantUnit.tenant:id,full_name');

                $created[] = RentInvoiceResource::make($invoice);
            }

            DB::commit();

            return response()->json([
                'message' => sprintf(
                    'Bulk invoice generation completed. Created: %d, Skipped: %d, Failed: %d',
                    count($created),
                    count($skipped),
                    count($failed)
                ),
                'created' => count($created),
                'skipped' => count($skipped),
                'failed' => count($failed),
                'invoices' => $created,
                'skipped_details' => $skipped,
                'failed_details' => $failed,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Bulk invoice generation failed: ' . $e->getMessage(),
                'created' => count($created),
                'skipped' => count($skipped),
                'failed' => count($failed) + ($tenantUnits->count() - count($created) - count($skipped) - count($failed)),
                'invoices' => $created,
                'skipped_details' => $skipped,
                'failed_details' => $failed,
            ], 500);
        }
    }
}

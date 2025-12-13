<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantPaymentSubmissionResource;
use App\Models\TenantPaymentSubmission;
use App\Models\UnifiedPayment;
use App\Models\UnifiedPaymentEntry;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TenantPaymentSubmissionController extends Controller
{
    use AuthorizesRequests;

    /**
     * Get all payment submissions for the authenticated landlord
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $landlordId = $user->isSuperAdmin() 
            ? $request->input('landlord_id')
            : $user->landlord_id;

        if ($user->isSuperAdmin() && !$landlordId) {
            return response()->json([
                'message' => 'Super admin must specify landlord_id.',
            ], 422);
        }

        $query = TenantPaymentSubmission::with([
            'tenantUnit.tenant:id,full_name,email,phone',
            'tenantUnit.unit:id,unit_number,property_id',
            'tenantUnit.unit.property:id,name',
            'rentInvoice:id,invoice_number,invoice_date,due_date',
            'confirmedBy:id,first_name,last_name,email',
        ])
            ->where('landlord_id', $landlordId)
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by tenant_unit_id
        if ($request->has('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->input('tenant_unit_id'));
        }

        // Filter by rent_invoice_id
        if ($request->has('rent_invoice_id')) {
            $query->where('rent_invoice_id', $request->input('rent_invoice_id'));
        }

        $perPage = min($request->input('per_page', 15), 100);
        $submissions = $query->paginate($perPage);

        return TenantPaymentSubmissionResource::collection($submissions)
            ->response();
    }

    /**
     * Get a specific payment submission
     */
    public function show(Request $request, TenantPaymentSubmission $submission): JsonResponse
    {
        $user = $request->user();
        
        // Ensure submission belongs to user's landlord
        if (!$user->isSuperAdmin() && $submission->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this payment submission.');
        }

        $submission->load([
            'tenantUnit.tenant:id,full_name,email,phone',
            'tenantUnit.unit:id,unit_number,property_id',
            'tenantUnit.unit.property:id,name',
            'rentInvoice:id,invoice_number,invoice_date,due_date,rent_amount,late_fee',
            'confirmedBy:id,first_name,last_name,email',
        ]);

        return TenantPaymentSubmissionResource::make($submission)
            ->response();
    }

    /**
     * Confirm a payment submission
     */
    public function confirm(Request $request, TenantPaymentSubmission $submission): JsonResponse
    {
        $user = $request->user();
        
        // Ensure submission belongs to user's landlord
        if (!$user->isSuperAdmin() && $submission->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this payment submission.');
        }

        if ($submission->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending submissions can be confirmed.',
                'current_status' => $submission->status,
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Update submission status
            $submission->update([
                'status' => 'confirmed',
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
                'notes' => $validated['notes'] ?? $submission->notes,
            ]);

            // Create unified payment entry
            $tenantUnit = $submission->tenantUnit;
            $invoice = $submission->rentInvoice;

            // Find or create unified payment for this tenant unit
            $unifiedPayment = UnifiedPayment::firstOrCreate(
                [
                    'tenant_unit_id' => $submission->tenant_unit_id,
                    'landlord_id' => $submission->landlord_id,
                ],
                [
                    'tenant_name' => $tenantUnit->tenant->full_name ?? 'Unknown',
                    'unit_number' => $tenantUnit->unit->unit_number ?? 'Unknown',
                    'property_name' => $tenantUnit->unit->property->name ?? 'Unknown',
                    'monthly_rent' => $tenantUnit->monthly_rent,
                    'currency' => $tenantUnit->currency ?? 'MVR',
                ]
            );

            // Create payment entry
            UnifiedPaymentEntry::create([
                'unified_payment_id' => $unifiedPayment->id,
                'tenant_unit_id' => $submission->tenant_unit_id,
                'rent_invoice_id' => $submission->rent_invoice_id,
                'payment_amount' => $submission->payment_amount,
                'payment_date' => $submission->payment_date,
                'payment_method' => $submission->payment_method,
                'receipt_path' => $submission->receipt_path,
                'notes' => $submission->notes,
                'submitted_by_tenant' => true,
                'tenant_submission_id' => $submission->id,
            ]);

            // Update invoice status if fully paid
            $totalPaid = UnifiedPaymentEntry::where('rent_invoice_id', $submission->rent_invoice_id)
                ->sum('payment_amount');
            
            $invoiceTotal = (float) $invoice->rent_amount + (float) $invoice->late_fee - (float) $invoice->advance_rent_applied;
            
            if ($totalPaid >= $invoiceTotal) {
                $invoice->update(['status' => 'paid']);
            } else {
                $invoice->update(['status' => 'partial']);
            }

            DB::commit();

            Log::info('Tenant payment submission confirmed', [
                'submission_id' => $submission->id,
                'confirmed_by' => $user->id,
                'invoice_id' => $submission->rent_invoice_id,
            ]);

            $submission->load([
                'tenantUnit.tenant:id,full_name,email,phone',
                'tenantUnit.unit:id,unit_number,property_id',
                'rentInvoice:id,invoice_number',
                'confirmedBy:id,first_name,last_name,email',
            ]);

            return TenantPaymentSubmissionResource::make($submission)
                ->response()
                ->setStatusCode(200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error confirming tenant payment submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to confirm payment submission. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Reject a payment submission
     */
    public function reject(Request $request, TenantPaymentSubmission $submission): JsonResponse
    {
        $user = $request->user();
        
        // Ensure submission belongs to user's landlord
        if (!$user->isSuperAdmin() && $submission->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this payment submission.');
        }

        if ($submission->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending submissions can be rejected.',
                'current_status' => $submission->status,
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'required|string|max:1000',
        ], [
            'notes.required' => 'Please provide a reason for rejecting this payment.',
        ]);

        $submission->update([
            'status' => 'rejected',
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
            'notes' => $validated['notes'],
        ]);

        Log::info('Tenant payment submission rejected', [
            'submission_id' => $submission->id,
            'rejected_by' => $user->id,
            'reason' => $validated['notes'],
        ]);

        $submission->load([
            'tenantUnit.tenant:id,full_name,email,phone',
            'tenantUnit.unit:id,unit_number,property_id',
            'rentInvoice:id,invoice_number',
            'confirmedBy:id,first_name,last_name,email',
        ]);

        return TenantPaymentSubmissionResource::make($submission)
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Download receipt file
     */
    public function downloadReceipt(Request $request, TenantPaymentSubmission $submission): \Illuminate\Http\Response
    {
        $user = $request->user();
        
        // Ensure submission belongs to user's landlord
        if (!$user->isSuperAdmin() && $submission->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this payment submission.');
        }

        if (!$submission->receipt_path) {
            abort(404, 'Receipt not found for this payment submission.');
        }

        $disk = config('filesystems.default', 'local');
        
        if (!Storage::disk($disk)->exists($submission->receipt_path)) {
            Log::error('Receipt file not found', [
                'submission_id' => $submission->id,
                'receipt_path' => $submission->receipt_path,
                'disk' => $disk,
            ]);
            abort(404, 'Receipt file not found on storage.');
        }

        try {
            $fileContents = Storage::disk($disk)->get($submission->receipt_path);
            $fileName = basename($submission->receipt_path);
            
            // Determine content type
            $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $contentType = match($extension) {
                'pdf' => 'application/pdf',
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                default => 'application/octet-stream',
            };

            return response($fileContents, 200, [
                'Content-Type' => $contentType,
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]);
        } catch (\Exception $e) {
            Log::error('Error downloading receipt', [
                'submission_id' => $submission->id,
                'receipt_path' => $submission->receipt_path,
                'error' => $e->getMessage(),
            ]);
            abort(500, 'Failed to download receipt file.');
        }
    }

    /**
     * View receipt file (inline)
     */
    public function viewReceipt(Request $request, TenantPaymentSubmission $submission): \Illuminate\Http\Response
    {
        $user = $request->user();
        
        // Ensure submission belongs to user's landlord
        if (!$user->isSuperAdmin() && $submission->landlord_id !== $user->landlord_id) {
            abort(403, 'Unauthorized access to this payment submission.');
        }

        if (!$submission->receipt_path) {
            abort(404, 'Receipt not found for this payment submission.');
        }

        $disk = config('filesystems.default', 'local');
        
        if (!Storage::disk($disk)->exists($submission->receipt_path)) {
            Log::error('Receipt file not found for viewing', [
                'submission_id' => $submission->id,
                'receipt_path' => $submission->receipt_path,
                'disk' => $disk,
            ]);
            abort(404, 'Receipt file not found on storage.');
        }

        try {
            $fileContents = Storage::disk($disk)->get($submission->receipt_path);
            $fileName = basename($submission->receipt_path);
            
            // Determine content type
            $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $contentType = match($extension) {
                'pdf' => 'application/pdf',
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                default => 'application/octet-stream',
            };

            return response($fileContents, 200, [
                'Content-Type' => $contentType,
                'Content-Disposition' => 'inline; filename="' . $fileName . '"',
            ]);
        } catch (\Exception $e) {
            Log::error('Error viewing receipt', [
                'submission_id' => $submission->id,
                'receipt_path' => $submission->receipt_path,
                'error' => $e->getMessage(),
            ]);
            abort(500, 'Failed to load receipt file.');
        }
    }
}


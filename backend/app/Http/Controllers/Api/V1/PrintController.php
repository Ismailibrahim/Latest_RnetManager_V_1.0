<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\SecurityDepositRefund;
use App\Models\UnifiedPaymentEntry;
use App\Services\DocumentTemplateService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;
use Mpdf\Mpdf;

class PrintController extends Controller
{
    use AuthorizesRequests;

    private const ALLOWED_TYPES = [
        'rent-invoice',
        'maintenance-invoice',
        'security-deposit-slip',
        'advance-rent-receipt',
        'fee-collection-receipt',
        'security-deposit-refund',
        'other-income-receipt',
        'payment-voucher',
        'unified-payment-entry',
    ];

    public function __construct(
        private readonly DocumentTemplateService $templateService
    ) {
    }

    /**
     * Print a document (invoice/receipt/voucher).
     *
     * @param  Request  $request
     * @param  string  $type  Document type
     * @param  int  $id  Document ID
     * @return JsonResponse|\Illuminate\Http\Response
     */
    public function print(Request $request, string $type, int $id)
    {
        // Validate document type
        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            return response()->json([
                'message' => 'Invalid document type.',
                'allowed_types' => self::ALLOWED_TYPES,
            ], 400);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Authorize and get document
        $document = $this->getDocument($type, $id);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        // Check authorization
        if (!$this->authorizeDocument($user, $document, $type)) {
            return response()->json(['message' => 'Unauthorized access to this document.'], 403);
        }

        // Get landlord ID
        $landlordId = $this->getDocumentLandlordId($document, $type);
        if (!$landlordId) {
            return response()->json(['message' => 'Unable to determine landlord for this document.'], 500);
        }

        // Get template
        $template = DocumentTemplate::getTemplate($landlordId, $this->getTemplateType($type));
        if (!$template) {
            return response()->json([
                'message' => 'Template not found for this document type.',
                'type' => $type,
            ], 404);
        }

        // Prepare data
        try {
            $data = $this->templateService->prepareDataForDocument($type, $id);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to prepare document data.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        // Render template
        try {
            $html = $this->templateService->renderTemplate($template->template_html, $data);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to render template.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        // Determine output format
        $format = $request->query('format', 'html');

        if ($format === 'pdf') {
            return $this->generatePdf($html, $this->getDocumentNumber($document, $type));
        }

        // Return HTML - CORS headers are handled by ForceCors middleware
        return response()->json([
            'html' => $html,
            'type' => $type,
            'id' => $id,
        ]);
    }

    /**
     * Get document by type and ID.
     */
    private function getDocument(string $type, int $id)
    {
        return match ($type) {
            'rent-invoice' => RentInvoice::find($id),
            'maintenance-invoice' => MaintenanceInvoice::find($id),
            'security-deposit-slip' => UnifiedPaymentEntry::find($id),
            'advance-rent-receipt' => FinancialRecord::find($id),
            'fee-collection-receipt' => UnifiedPaymentEntry::find($id),
            'security-deposit-refund' => SecurityDepositRefund::find($id),
            'other-income-receipt' => UnifiedPaymentEntry::find($id),
            'payment-voucher' => UnifiedPaymentEntry::find($id),
            'unified-payment-entry' => UnifiedPaymentEntry::find($id),
            default => null,
        };
    }

    /**
     * Authorize document access.
     */
    private function authorizeDocument($user, $document, string $type): bool
    {
        // Super admins can access all documents
        if ($user->isSuperAdmin()) {
            return true;
        }

        $landlordId = $this->getDocumentLandlordId($document, $type);
        if (!$landlordId) {
            return false;
        }

        // Check if document belongs to user's landlord
        return $landlordId === $user->landlord_id;
    }

    /**
     * Get landlord ID from document.
     */
    public function getDocumentLandlordId($document, string $type): ?int
    {
        if (!$document) {
            return null;
        }

        // Most documents have landlord_id directly
        if (isset($document->landlord_id)) {
            return $document->landlord_id;
        }

        // UnifiedPaymentEntry might need special handling
        if ($document instanceof UnifiedPaymentEntry) {
            return $document->landlord_id ?? null;
        }

        return null;
    }

    /**
     * Get template type from document type.
     */
    private function getTemplateType(string $type): string
    {
        return match ($type) {
            'rent-invoice' => 'rent_invoice',
            'maintenance-invoice' => 'maintenance_invoice',
            'security-deposit-slip' => 'security_deposit_slip',
            'advance-rent-receipt' => 'advance_rent_receipt',
            'fee-collection-receipt' => 'fee_collection_receipt',
            'security-deposit-refund' => 'security_deposit_refund',
            'other-income-receipt' => 'other_income_receipt',
            'payment-voucher' => 'payment_voucher',
            'unified-payment-entry' => 'unified_payment_entry',
            default => $type,
        };
    }

    /**
     * Get document number for filename.
     */
    private function getDocumentNumber($document, string $type): string
    {
        return match ($type) {
            'rent-invoice' => $document->invoice_number ?? 'rent-invoice',
            'maintenance-invoice' => $document->invoice_number ?? 'maintenance-invoice',
            'security-deposit-slip' => $document->reference_number ?? 'security-deposit-slip',
            'advance-rent-receipt' => $document->invoice_number ?? 'advance-rent-receipt',
            'fee-collection-receipt' => $document->reference_number ?? 'fee-collection-receipt',
            'security-deposit-refund' => $document->refund_number ?? 'security-deposit-refund',
            'other-income-receipt' => $document->reference_number ?? 'other-income-receipt',
            'payment-voucher' => $document->reference_number ?? 'payment-voucher',
            'unified-payment-entry' => $document->reference_number ?? 'payment-entry',
            default => 'document',
        };
    }

    /**
     * Generate PDF from HTML.
     */
    private function generatePdf(string $html, string $filename): \Illuminate\Http\Response
    {
        try {
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

            $safeFilename = Str::slug($filename) . '.pdf';

            // CORS headers are handled by ForceCors middleware
            return Response::make($binary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "inline; filename=\"{$safeFilename}\"",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate PDF.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}

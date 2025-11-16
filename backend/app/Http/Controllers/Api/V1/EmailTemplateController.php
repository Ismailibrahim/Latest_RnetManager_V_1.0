<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmailTemplate\PreviewEmailTemplateRequest;
use App\Http\Requests\EmailTemplate\StoreEmailTemplateRequest;
use App\Http\Requests\EmailTemplate\UpdateEmailTemplateRequest;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmailTemplateController extends Controller
{
    /**
     * Display a listing of email templates.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $landlordId = $user->landlord_id;

        $query = EmailTemplate::where('landlord_id', $landlordId)
            ->orderBy('type')
            ->orderBy('is_default', 'desc')
            ->orderBy('name');

        // Filter by type if provided
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $templates = $query->get();

        return response()->json([
            'data' => $templates,
        ]);
    }

    /**
     * Store a newly created email template.
     */
    public function store(StoreEmailTemplateRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $landlordId = $user->landlord_id;
        $validated = $request->validated();

        // If setting as default, unset other defaults for the same type
        if ($validated['is_default'] ?? false) {
            EmailTemplate::where('landlord_id', $landlordId)
                ->where('type', $validated['type'] ?? null)
                ->update(['is_default' => false]);
        }

        $template = EmailTemplate::create([
            'landlord_id' => $landlordId,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? null,
            'subject' => $validated['subject'],
            'body_html' => $validated['body_html'] ?? null,
            'body_text' => $validated['body_text'] ?? null,
            'variables' => $validated['variables'] ?? [],
            'is_default' => $validated['is_default'] ?? false,
        ]);

        return response()->json([
            'message' => 'Email template created successfully.',
            'data' => $template,
        ], 201);
    }

    /**
     * Display the specified email template.
     */
    public function show(EmailTemplate $emailTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Ensure template belongs to user's landlord
        if ($emailTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        return response()->json([
            'data' => $emailTemplate,
        ]);
    }

    /**
     * Update the specified email template.
     */
    public function update(UpdateEmailTemplateRequest $request, EmailTemplate $emailTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($emailTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $validated = $request->validated();

        // If setting as default, unset other defaults for the same type
        if (isset($validated['is_default']) && $validated['is_default']) {
            EmailTemplate::where('landlord_id', $emailTemplate->landlord_id)
                ->where('type', $emailTemplate->type)
                ->where('id', '!=', $emailTemplate->id)
                ->update(['is_default' => false]);
        }

        $emailTemplate->update($validated);

        return response()->json([
            'message' => 'Email template updated successfully.',
            'data' => $emailTemplate->fresh(),
        ]);
    }

    /**
     * Remove the specified email template.
     */
    public function destroy(EmailTemplate $emailTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = request()->user();

        // Ensure template belongs to user's landlord
        if ($emailTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $emailTemplate->delete();

        return response()->json([
            'message' => 'Email template deleted successfully.',
        ]);
    }

    /**
     * Set template as default for its type.
     */
    public function setDefault(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($emailTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        DB::transaction(function () use ($emailTemplate) {
            // Unset other defaults for the same type
            EmailTemplate::where('landlord_id', $emailTemplate->landlord_id)
                ->where('type', $emailTemplate->type)
                ->where('id', '!=', $emailTemplate->id)
                ->update(['is_default' => false]);

            // Set this template as default
            $emailTemplate->update(['is_default' => true]);
        });

        return response()->json([
            'message' => 'Template set as default successfully.',
            'data' => $emailTemplate->fresh(),
        ]);
    }

    /**
     * Preview template with sample data.
     */
    public function preview(PreviewEmailTemplateRequest $request, EmailTemplate $emailTemplate): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Ensure template belongs to user's landlord
        if ($emailTemplate->landlord_id !== $user->landlord_id) {
            return response()->json([
                'message' => 'Template not found.',
            ], 404);
        }

        $sampleData = $request->validated()['data'] ?? $this->getSampleData($emailTemplate->type);

        $rendered = $emailTemplate->render($sampleData);

        return response()->json([
            'subject' => $rendered['subject'],
            'body_html' => $rendered['body_html'],
            'body_text' => $rendered['body_text'],
        ]);
    }

    /**
     * Get sample data for template type.
     *
     * @param  string|null  $type  Template type
     * @return array<string, mixed>
     */
    protected function getSampleData(?string $type): array
    {
        return match ($type) {
            'rent_due' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '5000.00',
                'due_date' => now()->addDays(7)->format('Y-m-d'),
                'invoice_number' => 'RINV-202501-001',
            ],
            'rent_received' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '5000.00',
                'payment_date' => now()->format('Y-m-d'),
                'invoice_number' => 'RINV-202501-001',
            ],
            'maintenance_request' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'request_title' => 'Leaky Faucet',
                'status' => 'In Progress',
                'request_number' => 'MREQ-202501-001',
            ],
            'lease_expiry' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'expiry_date' => now()->addMonths(1)->format('Y-m-d'),
            ],
            'security_deposit' => [
                'tenant_name' => 'John Doe',
                'unit_number' => '101',
                'amount' => '10000.00',
                'status' => 'Refunded',
            ],
            default => [
                'message' => 'Sample notification message',
                'date' => now()->format('Y-m-d'),
            ],
        };
    }
}


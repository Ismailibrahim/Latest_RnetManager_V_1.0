<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantDocumentResource;
use App\Models\Tenant;
use App\Models\TenantDocument;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TenantDocumentController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request, Tenant $tenant)
    {
        $this->authorize('view', $tenant);

        $perPage = $this->resolvePerPage($request, 25);

        $query = $tenant->documents()->latest();

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->boolean('paginate', true)) {
            $documents = $query
                ->paginate($perPage)
                ->withQueryString();

            return TenantDocumentResource::collection($documents);
        }

        return TenantDocumentResource::collection($query->get());
    }

    public function store(Request $request, Tenant $tenant): TenantDocumentResource
    {
        $this->authorize('update', $tenant);

        $validated = $request->validate([
            // Size in kilobytes; default 20MB if env not set
            'file' => ['required', 'file', 'max:' . (int) env('TENANT_DOC_MAX_KB', 20480)],
            'category' => ['nullable', 'string', 'in:general,id_proof'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_id_proof' => ['sometimes', 'boolean'],
        ]);

        /** @var UploadedFile $file */
        $file = $validated['file'];
        $disk = config('filesystems.default', 'public');
        $path = $file->store("tenants/{$tenant->id}/documents", $disk);
        $category = $validated['category'] ?? ($request->boolean('is_id_proof') ? 'id_proof' : 'general');

        $document = TenantDocument::query()->create([
            'tenant_id' => $tenant->id,
            'landlord_id' => $tenant->landlord_id,
            'uploaded_by' => $this->getAuthenticatedUser($request)->id,
            'category' => $category,
            'title' => $validated['title'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'description' => $validated['description'] ?? null,
        ]);

        if ($request->boolean('is_id_proof')) {
            $tenant->forceFill([
                'id_proof_document_id' => $document->id,
            ])->save();
        }

        return TenantDocumentResource::make($document);
    }

    public function show(TenantDocument $document): TenantDocumentResource
    {
        $this->authorize('view', $document->tenant);

        return TenantDocumentResource::make($document);
    }

    public function update(Request $request, TenantDocument $document): TenantDocumentResource
    {
        $tenant = $document->tenant;
        $this->authorize('update', $tenant);

        $validated = $request->validate([
            'category' => ['sometimes', 'nullable', 'string', 'in:general,id_proof'],
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'is_id_proof' => ['sometimes', 'boolean'],
        ]);

        $document->fill([
            'category' => $validated['category'] ?? $document->category,
            'title' => array_key_exists('title', $validated) ? ($validated['title'] ?? $document->title) : $document->title,
            'description' => array_key_exists('description', $validated) ? ($validated['description'] ?? null) : $document->description,
        ]);

        if ($request->has('is_id_proof')) {
            if ($request->boolean('is_id_proof')) {
                $document->category = 'id_proof';
                $tenant->forceFill(['id_proof_document_id' => $document->id])->save();
            } elseif ($tenant->id_proof_document_id === $document->id) {
                $tenant->forceFill(['id_proof_document_id' => null])->save();
            }
        } elseif (
            array_key_exists('category', $validated)
            && $validated['category'] !== 'id_proof'
            && $tenant->id_proof_document_id === $document->id
        ) {
            $tenant->forceFill(['id_proof_document_id' => null])->save();
        }

        $document->save();

        return TenantDocumentResource::make($document);
    }

    public function destroy(TenantDocument $document): JsonResponse
    {
        $tenant = $document->tenant;
        $this->authorize('update', $tenant);

        DB::transaction(function () use ($document, $tenant): void {
            if ($tenant->id_proof_document_id === $document->id) {
                $tenant->forceFill(['id_proof_document_id' => null])->save();
            }

            $document->delete();
        });

        return response()->noContent();
    }
}


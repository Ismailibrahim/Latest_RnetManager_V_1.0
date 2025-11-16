<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\TenantDocument */
class TenantDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'landlord_id' => $this->landlord_id,
            'category' => $this->category,
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'description' => $this->description,
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'download_url' => $this->when(
                $this->path && $this->disk,
                function () {
                    try {
                        return Storage::disk($this->disk)->temporaryUrl(
                            $this->path,
                            now()->addMinutes(15),
                        );
                    } catch (\Throwable $exception) {
                        try {
                            return Storage::disk($this->disk)->url($this->path);
                        } catch (\Throwable $inner) {
                            return null;
                        }
                    }
                },
            ),
        ];
    }
}


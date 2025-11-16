<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class TenantDocument extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'landlord_id',
        'uploaded_by',
        'category',
        'title',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'description',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected static function booted(): void
    {
        static::deleted(function (self $document): void {
            if (! $document->path || ! $document->disk) {
                return;
            }

            if (Storage::disk($document->disk)->exists($document->path)) {
                Storage::disk($document->disk)->delete($document->path);
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}


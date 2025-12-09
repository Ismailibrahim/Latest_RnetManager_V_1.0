<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'type',
        'name',
        'template_html',
        'variables',
        'is_default',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_default' => 'boolean',
    ];

    /**
     * Get the landlord that owns the template.
     */
    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    /**
     * Scope a query to only include templates for a specific type.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $type  Template type
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope a query to only include default templates.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope a query to only include templates for a specific landlord.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $landlordId  Landlord ID
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForLandlord($query, int $landlordId)
    {
        return $query->where('landlord_id', $landlordId);
    }

    /**
     * Get the default template for a specific type.
     *
     * @param  string  $type  Template type
     * @return DocumentTemplate|null
     */
    public static function getDefaultTemplate(string $type): ?self
    {
        return self::whereNull('landlord_id')
            ->where('type', $type)
            ->where('is_default', true)
            ->first();
    }

    /**
     * Get the template for a landlord and type, falling back to default if not found.
     *
     * @param  int|null  $landlordId  Landlord ID (null for system defaults)
     * @param  string  $type  Template type
     * @return DocumentTemplate|null
     */
    public static function getTemplate(?int $landlordId, string $type): ?self
    {
        // First try to get landlord-specific template
        if ($landlordId) {
            $template = self::where('landlord_id', $landlordId)
                ->where('type', $type)
                ->where('is_default', false)
                ->first();

            if ($template) {
                return $template;
            }
        }

        // Fall back to default template
        return self::getDefaultTemplate($type);
    }
}

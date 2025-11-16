<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'name',
        'type',
        'subject',
        'body_html',
        'body_text',
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
     * Get available variables for this template.
     *
     * @return array<string>
     */
    public function getVariables(): array
    {
        return $this->variables ?? [];
    }

    /**
     * Render the template with data.
     *
     * @param  array  $data  Data to replace placeholders
     * @return array{subject: string, body_html: string, body_text: string}
     */
    public function render(array $data): array
    {
        $subject = $this->renderString($this->subject, $data);
        $bodyHtml = $this->body_html ? $this->renderString($this->body_html, $data) : null;
        $bodyText = $this->body_text ? $this->renderString($this->body_text, $data) : null;

        return [
            'subject' => $subject,
            'body_html' => $bodyHtml,
            'body_text' => $bodyText,
        ];
    }

    /**
     * Render a string with data replacements.
     *
     * @param  string  $template  Template string
     * @param  array  $data  Data to replace
     * @return string Rendered string
     */
    protected function renderString(string $template, array $data): string
    {
        $rendered = $template;

        foreach ($data as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $rendered = str_replace($placeholder, $value, $rendered);
        }

        return $rendered;
    }

    /**
     * Validate that all required variables are present in data.
     *
     * @param  array  $data  Data to validate
     * @return bool True if all required variables are present
     */
    public function validateVariables(array $data): bool
    {
        $required = $this->getVariables();
        if (empty($required)) {
            return true;
        }

        foreach ($required as $variable) {
            if (! array_key_exists($variable, $data)) {
                return false;
            }
        }

        return true;
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
     * Scope a query to only include custom (non-default) templates.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCustom($query)
    {
        return $query->where('is_default', false);
    }
}


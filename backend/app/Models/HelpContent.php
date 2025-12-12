<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HelpContent extends Model
{
    use HasFactory;

    protected $table = 'help_content';

    protected $fillable = [
        'page_route',
        'title',
        'content_json',
    ];

    protected $casts = [
        'content_json' => 'array',
    ];

    /**
     * Get help content by page route
     *
     * @param string $pageRoute
     * @return HelpContent|null
     */
    public static function findByPageRoute(string $pageRoute): ?self
    {
        return static::where('page_route', $pageRoute)->first();
    }

    /**
     * Get formatted content for API response
     *
     * @return array
     */
    public function getFormattedContent(): array
    {
        $content = $this->content_json ?? [];

        return [
            'page' => $this->page_route,
            'title' => $this->title,
            'quickGuide' => $content['quickGuide'] ?? [],
            'faqs' => $content['faqs'] ?? [],
            'featureHighlights' => $content['featureHighlights'] ?? [],
            'relatedPages' => $content['relatedPages'] ?? [],
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemSettingsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $settings = is_array($this->resource) ? $this->resource : [];

        return [
            'company' => $settings['company'] ?? [],
            'currency' => $settings['currency'] ?? [],
            'invoice_numbering' => $settings['invoice_numbering'] ?? [],
            'payment_terms' => $settings['payment_terms'] ?? [],
            'system' => $settings['system'] ?? [],
            'documents' => $settings['documents'] ?? [],
            'tax' => $settings['tax'] ?? [],
        ];
    }

    /**
     * Create a new resource instance from settings array.
     *
     * @param  array<string, mixed>  $settings
     * @return static
     */
    public static function fromSettings(array $settings): static
    {
        return new static($settings);
    }
}


<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Notification */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'landlord_id' => $this->landlord_id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'priority' => $this->priority,
            'action_url' => $this->action_url,
            'expires_at' => $this->expires_at?->toISOString(),
            'sent_via' => $this->sent_via,
            'is_read' => (bool) $this->is_read,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}


<?php

namespace App\Http\Requests;

use App\Models\Notification;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $notification = $this->route('notification');

        if (! $notification instanceof Notification) {
            return false;
        }

        return $this->user()?->can('update', $notification) ?? false;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_read' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
        ];
    }
}

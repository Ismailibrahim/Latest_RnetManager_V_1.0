<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserLoginLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->when(
                $this->relationLoaded('user') && $this->user !== null,
                function () {
                    $user = $this->user;
                    return [
                        'id' => $user->id ?? null,
                        'first_name' => $user->first_name ?? null,
                        'last_name' => $user->last_name ?? null,
                        'full_name' => $user->full_name ?? 'Unknown User',
                        'email' => $user->email ?? null,
                        'role' => $user->role ?? null,
                        'landlord' => $this->when(
                            $user->relationLoaded('landlord') && $user->landlord !== null,
                            function () use ($user) {
                                return [
                                    'id' => $user->landlord->id ?? null,
                                    'company_name' => $user->landlord->company_name ?? null,
                                ];
                            }
                        ),
                    ];
                }
            ),
            'logged_in_at' => $this->logged_in_at?->toIso8601String() ?? null,
            'logged_in_at_formatted' => $this->logged_in_at?->format('Y-m-d H:i:s') ?? null,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'device_info' => $this->parseUserAgent(),
        ];
    }

    /**
     * Parse user agent to extract device information.
     */
    private function parseUserAgent(): ?array
    {
        if (!$this->user_agent) {
            return null;
        }

        $ua = $this->user_agent;
        $device = 'Unknown';
        $browser = 'Unknown';
        $os = 'Unknown';

        // Simple parsing (you can enhance this with a proper library like jenssegers/agent)
        if (preg_match('/(iPhone|iPad|iPod)/i', $ua)) {
            $device = 'Mobile';
            $os = 'iOS';
        } elseif (preg_match('/Android/i', $ua)) {
            $device = 'Mobile';
            $os = 'Android';
        } elseif (preg_match('/(Windows|Macintosh|Linux)/i', $ua, $matches)) {
            $device = 'Desktop';
            $os = $matches[1];
        }

        if (preg_match('/Chrome/i', $ua)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox/i', $ua)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari/i', $ua)) {
            $browser = 'Safari';
        } elseif (preg_match('/Edge/i', $ua)) {
            $browser = 'Edge';
        }

        return [
            'device' => $device,
            'browser' => $browser,
            'os' => $os,
        ];
    }
}


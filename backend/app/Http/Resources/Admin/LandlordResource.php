<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Landlord */
class LandlordResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subscriptionLimit = $this->subscriptionLimit;
        $daysUntilExpiry = $this->daysUntilExpiry();
        $owner = $this->users()->where('role', 'owner')->first();

        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'subscription_tier' => $this->subscription_tier,
            'subscription_status' => $this->subscription_status,
            'subscription_started_at' => $this->subscription_started_at?->toDateString(),
            'subscription_expires_at' => $this->subscription_expires_at?->toDateString(),
            'subscription_auto_renew' => (bool) $this->subscription_auto_renew,
            'days_until_expiry' => $daysUntilExpiry,
            'is_active' => $this->isSubscriptionActive(),
            'is_expired' => $this->isExpired(),
            'subscription_limit' => $subscriptionLimit ? [
                'max_properties' => $subscriptionLimit->max_properties,
                'max_units' => $subscriptionLimit->max_units,
                'max_users' => $subscriptionLimit->max_users,
                'monthly_price' => (float) $subscriptionLimit->monthly_price,
                'features' => $subscriptionLimit->features ?? [],
            ] : null,
            'usage' => [
                'properties_count' => $this->properties()->count(),
                'units_count' => $this->units()->count(),
                'users_count' => $this->users()->count(),
            ],
            'owner' => $owner ? [
                'id' => $owner->id,
                'full_name' => $owner->full_name,
                'email' => $owner->email,
                'mobile' => $owner->mobile,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}


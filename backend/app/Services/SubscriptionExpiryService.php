<?php

namespace App\Services;

use App\Models\Landlord;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SubscriptionExpiryService
{
    /**
     * Check and mark expired subscriptions.
     *
     * @return array{checked: int, expired: int, downgraded: int}
     */
    public function checkExpiredSubscriptions(): array
    {
        $checked = 0;
        $expired = 0;
        $downgraded = 0;

        // Find all active subscriptions that should be expired
        $landlords = Landlord::query()
            ->where('subscription_status', Landlord::STATUS_ACTIVE)
            ->where('subscription_tier', '!=', Landlord::TIER_BASIC)
            ->whereNotNull('subscription_expires_at')
            ->where('subscription_expires_at', '<', now())
            ->get();

        $checked = $landlords->count();

        foreach ($landlords as $landlord) {
            $landlord->subscription_status = Landlord::STATUS_EXPIRED;
            $landlord->save();

            $expired++;

            // Optionally downgrade to basic tier
            // Uncomment if you want automatic downgrade
            // $this->downgradeToBasic($landlord);
            // $downgraded++;

            Log::info('Subscription expired', [
                'landlord_id' => $landlord->id,
                'company_name' => $landlord->company_name,
                'tier' => $landlord->subscription_tier,
                'expired_at' => $landlord->subscription_expires_at,
            ]);
        }

        return [
            'checked' => $checked,
            'expired' => $expired,
            'downgraded' => $downgraded,
        ];
    }

    /**
     * Check if subscription is currently active.
     */
    public function isSubscriptionActive(Landlord $landlord): bool
    {
        return $landlord->isSubscriptionActive();
    }

    /**
     * Calculate expiry date based on tier and months.
     */
    public function calculateExpiryDate(string $tier, int $months = 1): ?Carbon
    {
        // Basic tier never expires
        if ($tier === Landlord::TIER_BASIC) {
            return null;
        }

        return now()->addMonths($months)->startOfDay();
    }

    /**
     * Extend subscription by specified months.
     */
    public function extendSubscription(Landlord $landlord, int $months): Landlord
    {
        if ($landlord->subscription_tier === Landlord::TIER_BASIC) {
            // Basic tier doesn't need extension
            return $landlord;
        }

        $currentExpiry = $landlord->subscription_expires_at;

        if ($currentExpiry && $currentExpiry->isFuture()) {
            // Extend from current expiry date
            $newExpiry = $currentExpiry->copy()->addMonths($months);
        } else {
            // Extend from today
            $newExpiry = now()->addMonths($months)->startOfDay();
        }

        $landlord->subscription_expires_at = $newExpiry;
        $landlord->subscription_status = Landlord::STATUS_ACTIVE;
        $landlord->save();

        Log::info('Subscription extended', [
            'landlord_id' => $landlord->id,
            'months' => $months,
            'new_expiry' => $newExpiry,
        ]);

        return $landlord;
    }

    /**
     * Downgrade expired subscription to basic tier.
     */
    public function downgradeToBasic(Landlord $landlord): Landlord
    {
        $landlord->subscription_tier = Landlord::TIER_BASIC;
        $landlord->subscription_status = Landlord::STATUS_ACTIVE;
        $landlord->subscription_expires_at = null;
        $landlord->save();

        Log::info('Subscription downgraded to basic', [
            'landlord_id' => $landlord->id,
            'company_name' => $landlord->company_name,
        ]);

        return $landlord;
    }

    /**
     * Activate subscription and set expiry date if needed.
     */
    public function activateSubscription(Landlord $landlord, ?int $months = null): Landlord
    {
        $landlord->subscription_status = Landlord::STATUS_ACTIVE;

        // Set started_at if not set
        if (!$landlord->subscription_started_at) {
            $landlord->subscription_started_at = now();
        }

        // Set expiry date if tier is not basic and months provided
        if ($landlord->subscription_tier !== Landlord::TIER_BASIC && $months) {
            $landlord->subscription_expires_at = $this->calculateExpiryDate($landlord->subscription_tier, $months);
        } elseif ($landlord->subscription_tier === Landlord::TIER_BASIC) {
            $landlord->subscription_expires_at = null;
        }

        $landlord->save();

        return $landlord;
    }

    /**
     * Suspend subscription.
     */
    public function suspendSubscription(Landlord $landlord): Landlord
    {
        $landlord->subscription_status = Landlord::STATUS_SUSPENDED;
        $landlord->save();

        Log::info('Subscription suspended', [
            'landlord_id' => $landlord->id,
            'company_name' => $landlord->company_name,
        ]);

        return $landlord;
    }
}


<?php

namespace App\Policies;

use App\Models\LandlordSetting;
use App\Models\User;

class SystemSettingsPolicy
{
    /**
     * Determine if the user can view settings.
     */
    public function viewAny(User $user): bool
    {
        return (bool) $user->is_active;
    }

    /**
     * Determine if the user can view the settings.
     */
    public function view(User $user, ?LandlordSetting $setting = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // If setting is provided, check if it belongs to the user's landlord
        if ($setting) {
            return (int) $setting->landlord_id === (int) $user->landlord_id;
        }

        // Otherwise, allow if user is active (settings will be filtered by landlord_id in controller)
        return true;
    }

    /**
     * Determine if the user can update settings.
     * Only owners and admins can edit settings.
     */
    public function update(User $user, ?LandlordSetting $setting = null): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // Only owners and admins can edit settings
        if (! ($user->isOwner() || $user->isAdmin())) {
            return false;
        }

        // If setting is provided, check if it belongs to the user's landlord
        if ($setting) {
            return (int) $setting->landlord_id === (int) $user->landlord_id;
        }

        // Otherwise, allow if user is owner or admin (settings will be filtered by landlord_id in controller)
        return true;
    }
}


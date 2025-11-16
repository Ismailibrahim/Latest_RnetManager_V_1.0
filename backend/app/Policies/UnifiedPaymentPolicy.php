<?php

namespace App\Policies;

use App\Models\User;
class UnifiedPaymentPolicy extends BaseLandlordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }
}


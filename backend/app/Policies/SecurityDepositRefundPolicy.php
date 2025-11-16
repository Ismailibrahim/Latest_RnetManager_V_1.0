<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SecurityDepositRefundPolicy extends BaseLandlordPolicy
{
    protected function canFinance(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->is_active && $this->canFinance($user);
    }

    public function update(User $user, Model $refund): bool
    {
        return $user->is_active && $this->canFinance($user) && $this->sameLandlord($user, $refund);
    }

    public function delete(User $user, Model $refund): bool
    {
        return $user->is_active && $user->isOwner() && $this->sameLandlord($user, $refund);
    }
}


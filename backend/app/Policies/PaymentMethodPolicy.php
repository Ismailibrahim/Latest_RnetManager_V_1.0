<?php

namespace App\Policies;

use App\Models\PaymentMethod;
use App\Models\User;

class PaymentMethodPolicy
{
    protected function canManage(User $user): bool
    {
        return $user->is_active && ($user->isOwner() || $user->isAdmin());
    }

    public function viewAny(User $user): bool
    {
        return $this->canManage($user);
    }

    public function view(User $user, PaymentMethod $paymentMethod): bool
    {
        return $this->canManage($user);
    }

    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    public function update(User $user, PaymentMethod $paymentMethod): bool
    {
        return $this->canManage($user);
    }

    public function delete(User $user, PaymentMethod $paymentMethod): bool
    {
        return $this->canManage($user);
    }
}


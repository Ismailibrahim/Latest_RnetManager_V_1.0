<?php

namespace App\Policies;

use App\Models\PaymentMethod;
use App\Models\User;

class PaymentMethodPolicy
{
    /**
     * Check if user can manage (create/update/delete) payment methods.
     * Only owners, admins, and super admins can manage payment methods.
     */
    protected function canManage(User $user): bool
    {
        return $user->is_active && ($user->isSuperAdmin() || $user->isOwner() || $user->isAdmin());
    }

    /**
     * Payment methods are global and viewable by all active users.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    /**
     * Payment methods are global and viewable by all active users.
     */
    public function view(User $user, PaymentMethod $paymentMethod): bool
    {
        return $user->is_active;
    }

    /**
     * Only owners, admins, and super admins can create payment methods.
     */
    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    /**
     * Only owners, admins, and super admins can update payment methods.
     */
    public function update(User $user, PaymentMethod $paymentMethod): bool
    {
        return $this->canManage($user);
    }

    /**
     * Only owners, admins, and super admins can delete payment methods.
     */
    public function delete(User $user, PaymentMethod $paymentMethod): bool
    {
        return $this->canManage($user);
    }
}


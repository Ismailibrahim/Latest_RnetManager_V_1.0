<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class NotificationPolicy extends BaseLandlordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, Model $notification): bool
    {
        return $user->is_active && $this->sameLandlord($user, $notification);
    }

    public function update(User $user, Model $notification): bool
    {
        return $user->is_active && $this->sameLandlord($user, $notification);
    }

    public function delete(User $user, Model $notification): bool
    {
        return $user->is_active && $this->canManage($user) && $this->sameLandlord($user, $notification);
    }
}


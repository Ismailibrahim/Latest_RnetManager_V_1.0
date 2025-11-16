<?php

namespace App\Policies;

use App\Models\User;
use App\Policies\Concerns\HandlesLandlordAuthorization;
use Illuminate\Database\Eloquent\Model;

abstract class BaseLandlordPolicy
{
    use HandlesLandlordAuthorization;

    public function viewAny(User $user): bool
    {
        return (bool) $user->is_active;
    }

    public function view(User $user, Model $model): bool
    {
        return $user->is_active && $this->sameLandlord($user, $model);
    }

    public function create(User $user): bool
    {
        return $user->is_active && $this->canManage($user);
    }

    public function update(User $user, Model $model): bool
    {
        return $user->is_active && $this->canManage($user) && $this->sameLandlord($user, $model);
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->is_active && $this->canDelete($user) && $this->sameLandlord($user, $model);
    }
}


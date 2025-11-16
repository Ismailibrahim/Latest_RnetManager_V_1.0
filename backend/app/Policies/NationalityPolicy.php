<?php

namespace App\Policies;

use App\Models\Nationality;
use App\Models\User;

class NationalityPolicy
{
    public function viewAny(User $user): bool
    {
        return (bool) $user->is_active;
    }

    public function view(User $user, Nationality $nationality): bool
    {
        return (bool) $user->is_active;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }

    public function update(User $user, Nationality $nationality): bool
    {
        return $this->create($user);
    }

    public function delete(User $user, Nationality $nationality): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }
}


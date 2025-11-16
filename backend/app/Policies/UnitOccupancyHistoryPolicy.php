<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class UnitOccupancyHistoryPolicy extends BaseLandlordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, Model $history): bool
    {
        $history->loadMissing('unit');

        return $user->is_active && $this->sameLandlord($user, $history->unit);
    }

    public function create(User $user): bool
    {
        return $user->is_active && $this->canManage($user);
    }

    public function update(User $user, Model $history): bool
    {
        $history->loadMissing('unit');

        return $user->is_active && $this->canManage($user) && $this->sameLandlord($user, $history->unit);
    }

    public function delete(User $user, Model $history): bool
    {
        $history->loadMissing('unit');

        return $user->is_active && $this->canDelete($user) && $this->sameLandlord($user, $history->unit);
    }
}


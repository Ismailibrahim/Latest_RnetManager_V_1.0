<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AssetTypePolicy extends BaseLandlordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, Model $assetType): bool
    {
        return $user->is_active;
    }

    public function create(User $user): bool
    {
        return $user->is_active && $this->canManage($user);
    }

    public function update(User $user, Model $assetType): bool
    {
        return $user->is_active && $this->canManage($user);
    }

    public function delete(User $user, Model $assetType): bool
    {
        return $user->is_active && $this->canDelete($user);
    }
}


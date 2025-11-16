<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AssetPolicy extends BaseLandlordPolicy
{
    protected function sameAssetLandlord(User $user, Model $asset): bool
    {
        $asset->loadMissing('unit');

        return $asset->unit?->landlord_id === $user->landlord_id;
    }

    public function view(User $user, Model $asset): bool
    {
        return $user->is_active && $this->sameAssetLandlord($user, $asset);
    }

    public function update(User $user, Model $asset): bool
    {
        return $user->is_active && $this->canManage($user) && $this->sameAssetLandlord($user, $asset);
    }

    public function delete(User $user, Model $asset): bool
    {
        return $user->is_active && $this->canDelete($user) && $this->sameAssetLandlord($user, $asset);
    }
}


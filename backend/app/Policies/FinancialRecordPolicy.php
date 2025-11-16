<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class FinancialRecordPolicy extends BaseLandlordPolicy
{
    protected function canFinance(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->is_active && $this->canFinance($user);
    }

    public function update(User $user, Model $record): bool
    {
        return $user->is_active && $this->canFinance($user) && $this->sameLandlord($user, $record);
    }

    public function delete(User $user, Model $record): bool
    {
        return $user->is_active && $user->isOwner() && $this->sameLandlord($user, $record);
    }
}


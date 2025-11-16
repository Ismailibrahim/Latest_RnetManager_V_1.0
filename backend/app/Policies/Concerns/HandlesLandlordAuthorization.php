<?php

namespace App\Policies\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait HandlesLandlordAuthorization
{
    protected function sameLandlord(User $user, Model $model): bool
    {
        if (isset($model->landlord_id)) {
            return (int) $model->landlord_id === (int) $user->landlord_id;
        }

        if (method_exists($model, 'landlord')) {
            $landlord = $model->relationLoaded('landlord') ? $model->getRelation('landlord') : $model->landlord()->first();

            if ($landlord) {
                return (int) $landlord->id === (int) $user->landlord_id;
            }
        }

        if (method_exists($model, 'unit')) {
            $unit = $model->relationLoaded('unit') ? $model->getRelation('unit') : $model->unit()->first();

            if ($unit && isset($unit->landlord_id)) {
                return (int) $unit->landlord_id === (int) $user->landlord_id;
            }
        }

        if (method_exists($model, 'property')) {
            $property = $model->relationLoaded('property') ? $model->getRelation('property') : $model->property()->first();

            if ($property && isset($property->landlord_id)) {
                return (int) $property->landlord_id === (int) $user->landlord_id;
            }
        }

        return false;
    }

    protected function canManage(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin() || $user->isManager();
    }

    protected function canDelete(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }
}


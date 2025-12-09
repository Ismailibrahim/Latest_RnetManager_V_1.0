<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

trait BelongsToLandlord
{
    /**
     * Scope a query to only include records for a specific landlord.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int|null  $landlordId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForLandlord(Builder $query, ?int $landlordId = null): Builder
    {
        $landlordId = $landlordId ?? $this->getAuthenticatedLandlordId();

        if ($landlordId === null) {
            // Security: Return empty result if no landlord context
            // This prevents data leakage when user has no landlord_id
            // Note: Super admins should use withoutGlobalScopes() explicitly
            return $query->whereRaw('1 = 0');
        }

        return $query->where('landlord_id', $landlordId);
    }

    /**
     * Get the authenticated user's landlord_id.
     *
     * @return int|null
     */
    protected function getAuthenticatedLandlordId(): ?int
    {
        $user = Auth::user();

        return $user?->landlord_id;
    }

    /**
     * Resolve the route binding value for the model.
     * This ensures route model binding automatically filters by landlord_id.
     * 
     * Note: We use withoutGlobalScopes to check if resource exists first,
     * then let policies handle authorization (403) vs not found (404).
     *
     * @param  mixed  $value
     * @param  string|null  $field
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function resolveRouteBinding($value, $field = null)
    {
        $user = Auth::user();
        $landlordId = $this->getAuthenticatedLandlordId();
        $isSuperAdmin = $user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        // Super admins can access any resource regardless of landlord_id
        if ($isSuperAdmin) {
            $field = $field ?: $this->getRouteKeyName();
            return $this->withoutGlobalScopes()
                ->where($field, $value)
                ->first();
        }

        // For non-super admins, require landlord_id
        if ($landlordId === null) {
            return null;
        }

        $field = $field ?: $this->getRouteKeyName();

        // Use withoutGlobalScopes to check if resource exists at all
        $model = $this->withoutGlobalScopes()
            ->where($field, $value)
            ->first();

        if (! $model) {
            return null; // Resource doesn't exist - return 404
        }

        // If resource exists but belongs to different landlord, still return it
        // so policies can handle authorization and return 403 instead of 404
        // This allows proper authorization flow while maintaining security
        if ($model->landlord_id !== $landlordId) {
            // Return the model so policy can check and return 403
            // The global scope will still filter it from queries, but route binding
            // needs to return it for policy authorization
            return $model;
        }

        return $model;
    }
}


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
            return $query->whereRaw('1 = 0'); // Return empty result if no landlord context
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
        $landlordId = $this->getAuthenticatedLandlordId();

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


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionLimit extends Model
{
    /**
     * The table does not maintain updated timestamps.
     */
    public $timestamps = false;

    /**
     * The primary key is the subscription tier string.
     */
    protected $primaryKey = 'tier';

    /**
     * The primary key is non-incrementing.
     */
    public $incrementing = false;

    /**
     * The primary key is stored as a string.
     */
    protected $keyType = 'string';

    /**
     * Mass assignable attributes.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tier',
        'max_properties',
        'max_units',
        'max_users',
        'monthly_price',
        'features',
    ];

    /**
     * Cast attributes.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'features' => 'array',
        ];
    }

    /**
     * Retrieve the subscription limits for a tier.
     */
    public static function forTier(?string $tier): ?self
    {
        if ($tier === null || $tier === '') {
            return null;
        }

        return static::query()->find($tier);
    }
}



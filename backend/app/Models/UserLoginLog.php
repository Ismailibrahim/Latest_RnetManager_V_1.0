<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLoginLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'logged_in_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'logged_in_at' => 'datetime',
    ];

    /**
     * Get the user that made the login.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if user has logged in today.
     *
     * @param  int  $userId
     * @return bool
     */
    public static function hasLoggedInToday(int $userId): bool
    {
        return static::where('user_id', $userId)
            ->whereDate('logged_in_at', today())
            ->exists();
    }
}
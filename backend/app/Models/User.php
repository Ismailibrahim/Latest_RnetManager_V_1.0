<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    public const ROLE_OWNER = 'owner';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_MANAGER = 'manager';
    public const ROLE_AGENT = 'agent';

    public const ROLES = [
        self::ROLE_OWNER,
        self::ROLE_ADMIN,
        self::ROLE_MANAGER,
        self::ROLE_AGENT,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'landlord_id',
        'first_name',
        'last_name',
        'email',
        'mobile',
        'password_hash',
        'role',
        'is_active',
        'email_verified_at',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
        'remember_token', // maintained for compatibility with Laravel session auth if needed
    ];

    /**
     * The attributes that should be appended for serialization.
     *
     * @var list<string>
     */
    protected $appends = [
        'full_name',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Automatically hash passwords when setting the attribute.
     */
    protected function passwordHash(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => match (true) {
                $value === null || $value === '' => null,
                Hash::needsRehash($value) => Hash::make($value),
                default => $value,
            },
        );
    }

    /**
     * Return the hashed password field for authentication.
     */
    public function getAuthPassword(): ?string
    {
        return $this->password_hash;
    }

    /**
     * Relationship: landlord.
     */
    public function landlord(): BelongsTo
    {
        return $this->belongsTo(Landlord::class);
    }

    /**
     * Accessor: get full name.
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isManager(): bool
    {
        return $this->role === self::ROLE_MANAGER;
    }

    public function isAgent(): bool
    {
        return $this->role === self::ROLE_AGENT;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
        'supports_reference',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'supports_reference' => 'boolean',
    ];
}


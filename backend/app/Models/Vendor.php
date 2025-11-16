<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'landlord_id',
        'name',
        'service_category',
        'phone',
        'email',
        'is_preferred',
        'notes',
    ];
}



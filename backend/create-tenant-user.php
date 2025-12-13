<?php

/**
 * Script to create a User account for a tenant so they can log in
 * 
 * Usage: php create-tenant-user.php <tenant_email> [password]
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

if ($argc < 2) {
    echo "Usage: php create-tenant-user.php <tenant_email> [password]\n";
    echo "Example: php create-tenant-user.php tenant@example.com mypassword123\n";
    exit(1);
}

$tenantEmail = $argv[1];
$password = $argv[2] ?? 'tenant123'; // Default password

// Find tenant
$tenant = Tenant::where('email', $tenantEmail)->first();

if (!$tenant) {
    echo "Error: Tenant with email '{$tenantEmail}' not found.\n";
    echo "Available tenants:\n";
    Tenant::select('id', 'email', 'full_name')->get()->each(function($t) {
        echo "  - {$t->email} ({$t->full_name})\n";
    });
    exit(1);
}

// Check if user already exists
$existingUser = User::where('email', $tenantEmail)->first();

if ($existingUser) {
    echo "User account already exists for {$tenantEmail}\n";
    echo "User ID: {$existingUser->id}\n";
    echo "Role: {$existingUser->role}\n";
    echo "Landlord ID: " . ($existingUser->landlord_id ?? 'null') . "\n";
    echo "\nTo reset password, run:\n";
    echo "php artisan tinker --execute=\"\\\$u = \\App\\Models\\User::find({$existingUser->id}); \\\$u->password_hash = \\Illuminate\\Support\\Facades\\Hash::make('{$password}'); \\\$u->save(); echo 'Password updated';\"\n";
    exit(0);
}

// Create user account
try {
    $user = User::create([
        'email' => $tenant->email,
        'mobile' => $tenant->phone,
        'first_name' => explode(' ', $tenant->full_name)[0] ?? $tenant->full_name,
        'last_name' => implode(' ', array_slice(explode(' ', $tenant->full_name), 1)) ?? '',
        'password_hash' => Hash::make($password),
        'role' => 'agent', // Use agent role (lowest privilege) or create tenant role
        'landlord_id' => $tenant->landlord_id, // Match tenant's landlord
        'is_active' => true,
        'approval_status' => 'approved',
        'approved_at' => now(),
    ]);

    echo "✅ User account created successfully!\n\n";
    echo "Login Details:\n";
    echo "==============\n";
    echo "Email: {$user->email}\n";
    echo "Password: {$password}\n";
    echo "Role: {$user->role}\n";
    echo "Landlord ID: {$user->landlord_id}\n";
    echo "User ID: {$user->id}\n";
    echo "\n";
    echo "Tenant Information:\n";
    echo "===================\n";
    echo "Name: {$tenant->full_name}\n";
    echo "Phone: {$tenant->phone}\n";
    echo "Tenant ID: {$tenant->id}\n";
    echo "\n";
    echo "You can now log in with these credentials at: /login\n";
    
} catch (\Exception $e) {
    echo "❌ Error creating user account: {$e->getMessage()}\n";
    exit(1);
}


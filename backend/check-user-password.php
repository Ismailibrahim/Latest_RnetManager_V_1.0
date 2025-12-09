<?php

/**
 * Script to check and fix user password
 * Usage: php check-user-password.php samaan@outlook.com Password123!
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

$email = $argv[1] ?? 'samaan@outlook.com';
$password = $argv[2] ?? 'Password123!';

echo "Checking user: {$email}\n";
echo "Password to check: {$password}\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User not found!\n";
    exit(1);
}

echo "✅ User found:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->first_name} {$user->last_name}\n";
echo "   Email: {$user->email}\n";
echo "   Role: {$user->role}\n";
echo "   Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
echo "   Approval Status: " . ($user->approval_status ?? 'null') . "\n";
echo "   Password Hash: " . substr($user->password_hash ?? 'null', 0, 20) . "...\n\n";

// Check if password matches
if ($user->password_hash) {
    $passwordMatches = Hash::check($password, $user->password_hash);
    echo "Password check: " . ($passwordMatches ? "✅ MATCHES" : "❌ DOES NOT MATCH") . "\n\n";
    
    if (!$passwordMatches) {
        echo "Fixing password...\n";
        $hashedPassword = Hash::make($password);
        
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password_hash' => $hashedPassword,
                'updated_at' => now(),
            ]);
        
        echo "✅ Password updated!\n";
        
        // Verify the update
        $user->refresh();
        $newPasswordMatches = Hash::check($password, $user->password_hash);
        echo "Verification: " . ($newPasswordMatches ? "✅ Password now works!" : "❌ Still not working") . "\n";
    }
} else {
    echo "❌ No password hash found! Setting password...\n";
    $hashedPassword = Hash::make($password);
    
    DB::table('users')
        ->where('id', $user->id)
        ->update([
            'password_hash' => $hashedPassword,
            'updated_at' => now(),
        ]);
    
    echo "✅ Password set!\n";
}

// Check account status issues
echo "\n--- Account Status Check ---\n";
if (!$user->is_active) {
    echo "⚠️  Account is INACTIVE. Activating...\n";
    DB::table('users')
        ->where('id', $user->id)
        ->update(['is_active' => true]);
    echo "✅ Account activated!\n";
}

if ($user->approval_status === 'pending') {
    echo "⚠️  Account is PENDING approval. Approving...\n";
    DB::table('users')
        ->where('id', $user->id)
        ->update([
            'approval_status' => 'approved',
            'approved_at' => now(),
            'is_active' => true,
        ]);
    echo "✅ Account approved!\n";
}

if ($user->approval_status === 'rejected') {
    echo "⚠️  Account was REJECTED. Resetting to approved...\n";
    DB::table('users')
        ->where('id', $user->id)
        ->update([
            'approval_status' => 'approved',
            'approved_at' => now(),
            'rejected_at' => null,
            'rejected_reason' => null,
            'is_active' => true,
        ]);
    echo "✅ Account status reset to approved!\n";
}

echo "\n✅ Done! Try logging in now.\n";


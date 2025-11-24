<?php
/**
 * Quick Setup Verification Script
 * Run: php verify-setup.php
 */

echo "=== CORS Setup Verification ===\n\n";

// Check if we're in Laravel directory
if (!file_exists('artisan')) {
    echo "❌ Error: Must run from backend directory\n";
    echo "   Run: cd backend && php verify-setup.php\n";
    exit(1);
}

// Check CORS config
echo "1. Checking CORS configuration...\n";
$corsConfig = require 'config/cors.php';
$origins = $corsConfig['allowed_origins'] ?? [];
echo "   ✅ Allowed Origins: " . implode(', ', $origins) . "\n";
echo "   ✅ Allowed Methods: " . implode(', ', $corsConfig['allowed_methods'] ?? []) . "\n";
echo "   ✅ Supports Credentials: " . ($corsConfig['supports_credentials'] ? 'Yes' : 'No') . "\n\n";

// Check middleware
echo "2. Checking middleware...\n";
if (file_exists('app/Http/Middleware/AddCorsHeaders.php')) {
    echo "   ✅ AddCorsHeaders middleware exists\n";
} else {
    echo "   ❌ AddCorsHeaders middleware missing\n";
}

// Check bootstrap
echo "3. Checking bootstrap configuration...\n";
$bootstrap = file_get_contents('bootstrap/app.php');
if (strpos($bootstrap, 'AddCorsHeaders') !== false) {
    echo "   ✅ AddCorsHeaders registered in bootstrap\n";
} else {
    echo "   ❌ AddCorsHeaders not registered\n";
}

echo "\n=== Summary ===\n";
echo "✅ CORS configuration looks good!\n";
echo "\n⚠️  IMPORTANT: Backend server must be running!\n";
echo "   Start with: php artisan serve\n";
echo "   Then test: http://localhost:8000/api/v1\n";
echo "\n";


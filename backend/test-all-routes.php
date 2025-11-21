<?php

/**
 * Comprehensive Route Testing Script
 * Tests all API routes and reports their status
 */

$baseUrl = 'http://localhost:8000';
$results = [
    'success' => [],
    'auth_required' => [],
    'not_found' => [],
    'server_error' => [],
    'other' => [],
];

function testRoute($method, $url, $description, $headers = [], $body = null) {
    global $baseUrl, $results;
    
    $fullUrl = $baseUrl . $url;
    
    $ch = curl_init($fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $result = [
        'method' => $method,
        'url' => $url,
        'description' => $description,
        'status' => $httpCode,
        'error' => $error,
    ];
    
    if ($error) {
        $result['category'] = 'error';
        $results['other'][] = $result;
    } elseif ($httpCode == 200 || $httpCode == 201) {
        $result['category'] = 'success';
        $results['success'][] = $result;
    } elseif ($httpCode == 401 || $httpCode == 403) {
        $result['category'] = 'auth_required';
        $results['auth_required'][] = $result;
    } elseif ($httpCode == 404) {
        $result['category'] = 'not_found';
        $results['not_found'][] = $result;
    } elseif ($httpCode >= 500) {
        $result['category'] = 'server_error';
        $results['server_error'][] = $result;
    } else {
        $result['category'] = 'other';
        $results['other'][] = $result;
    }
    
    return $result;
}

echo "=== Comprehensive Route Testing ===\n\n";

// Check if server is running
echo "Checking server...\n";
$ch = curl_init($baseUrl . '/api/v1/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 3);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode != 200) {
    echo "❌ Server is not running or not accessible\n";
    echo "Please start the server: php artisan serve\n";
    exit(1);
}
echo "✅ Server is running\n\n";

$headers = ['Accept: application/json', 'Content-Type: application/json'];

// Public Routes
echo "Testing Public Routes...\n";
testRoute('GET', '/health', 'Health Check');
testRoute('GET', '/api/v1/', 'API Root');
testRoute('GET', '/api/v1/test-simple', 'Simple Test Route');
testRoute('GET', '/api/v1/currencies-test', 'Currencies Test Route');
testRoute('POST', '/api/v1/auth/login', 'Login (no credentials)', $headers, json_encode([]));
echo "\n";

// Protected Routes (will return 401 without auth)
echo "Testing Protected Routes (expected 401)...\n";

// Auth routes
testRoute('GET', '/api/v1/auth/me', 'Get Current User');
testRoute('POST', '/api/v1/auth/logout', 'Logout');

// Resource routes
testRoute('GET', '/api/v1/properties', 'List Properties');
testRoute('GET', '/api/v1/units', 'List Units');
testRoute('GET', '/api/v1/tenants', 'List Tenants');
testRoute('GET', '/api/v1/tenant-units', 'List Tenant Units');
testRoute('GET', '/api/v1/tenant-units/1/pending-charges', 'Pending Charges');
testRoute('GET', '/api/v1/rent-invoices', 'List Rent Invoices');
testRoute('GET', '/api/v1/financial-records', 'List Financial Records');
testRoute('GET', '/api/v1/maintenance-requests', 'List Maintenance Requests');
testRoute('GET', '/api/v1/maintenance-invoices', 'List Maintenance Invoices');
testRoute('GET', '/api/v1/assets', 'List Assets');
testRoute('GET', '/api/v1/vendors', 'List Vendors');
testRoute('GET', '/api/v1/payment-methods', 'List Payment Methods');
testRoute('GET', '/api/v1/currencies', 'List Currencies');
testRoute('GET', '/api/v1/payments', 'List Payments');
testRoute('POST', '/api/v1/payments', 'Create Payment', $headers, json_encode(['payment_type' => 'rent', 'amount' => 100]));
testRoute('GET', '/api/v1/security-deposit-refunds', 'List Security Deposit Refunds');
testRoute('GET', '/api/v1/notifications', 'List Notifications');
testRoute('GET', '/api/v1/account', 'Get Account');
testRoute('GET', '/api/v1/account/delegates', 'List Delegates');
testRoute('GET', '/api/v1/reports/unified-payments', 'Unified Payments Report');
testRoute('GET', '/api/v1/nationalities', 'List Nationalities');
testRoute('GET', '/api/v1/unit-types', 'List Unit Types');
testRoute('GET', '/api/v1/asset-types', 'List Asset Types');
testRoute('GET', '/api/v1/unit-occupancy-history', 'List Unit Occupancy History');

echo "\n";

// Summary
echo "=== Test Summary ===\n\n";
echo "✅ Success (200/201): " . count($results['success']) . "\n";
echo "⚠️  Auth Required (401/403): " . count($results['auth_required']) . "\n";
echo "❌ Not Found (404): " . count($results['not_found']) . "\n";
echo "🔥 Server Error (500+): " . count($results['server_error']) . "\n";
echo "❓ Other: " . count($results['other']) . "\n\n";

// Detailed Results
if (!empty($results['not_found'])) {
    echo "=== ❌ Routes Not Found (404) ===\n";
    foreach ($results['not_found'] as $result) {
        echo "  {$result['method']} {$result['url']} - {$result['description']}\n";
    }
    echo "\n";
}

if (!empty($results['server_error'])) {
    echo "=== 🔥 Server Errors (500+) ===\n";
    foreach ($results['server_error'] as $result) {
        echo "  {$result['method']} {$result['url']} - {$result['description']} (Status: {$result['status']})\n";
    }
    echo "\n";
}

if (!empty($results['other'])) {
    echo "=== ❓ Other Issues ===\n";
    foreach ($results['other'] as $result) {
        $errorMsg = $result['error'] ?: "Status: {$result['status']}";
        echo "  {$result['method']} {$result['url']} - {$result['description']} ({$errorMsg})\n";
    }
    echo "\n";
}

echo "=== ✅ Working Routes ===\n";
foreach ($results['success'] as $result) {
    echo "  {$result['method']} {$result['url']} - {$result['description']}\n";
}
echo "\n";

echo "=== ⚠️  Protected Routes (Require Authentication) ===\n";
echo "These routes correctly require authentication (401/403 is expected):\n";
foreach ($results['auth_required'] as $result) {
    echo "  {$result['method']} {$result['url']} - {$result['description']}\n";
}
echo "\n";

$totalRoutes = count($results['success']) + count($results['auth_required']) + count($results['not_found']) + count($results['server_error']) + count($results['other']);
$workingRoutes = count($results['success']) + count($results['auth_required']);

echo "=== Overall Status ===\n";
echo "Total Routes Tested: $totalRoutes\n";
echo "Working Routes: $workingRoutes (" . round(($workingRoutes / $totalRoutes) * 100, 1) . "%)\n";
echo "Broken Routes: " . (count($results['not_found']) + count($results['server_error'])) . "\n";

if (count($results['not_found']) > 0 || count($results['server_error']) > 0) {
    echo "\n⚠️  Some routes need attention!\n";
} else {
    echo "\n✅ All routes are working correctly!\n";
}

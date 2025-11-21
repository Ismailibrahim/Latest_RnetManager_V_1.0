<?php

/**
 * Test all API endpoints used by payments/collect page
 */

$baseUrl = 'http://localhost:8000';
$results = [];

function testEndpoint($method, $url, $description, $headers = [], $body = null) {
    global $baseUrl, $results;
    
    $fullUrl = $baseUrl . $url;
    echo "Testing: $description\n";
    echo "  $method $url\n";
    
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
    
    $status = 'UNKNOWN';
    $success = false;
    
    if ($error) {
        $status = "ERROR: $error";
    } elseif ($httpCode == 200 || $httpCode == 201) {
        $status = "✅ SUCCESS ($httpCode)";
        $success = true;
    } elseif ($httpCode == 404) {
        $status = "❌ NOT FOUND (404)";
    } elseif ($httpCode == 401) {
        $status = "⚠️ UNAUTHORIZED (401) - Auth required (expected)";
        $success = true; // Expected for protected routes
    } elseif ($httpCode == 422) {
        $status = "⚠️ VALIDATION ERROR (422) - Expected for POST without data";
        $success = true; // Expected
    } elseif ($httpCode >= 500) {
        $status = "❌ SERVER ERROR ($httpCode)";
    } else {
        $status = "⚠️ Status: $httpCode";
    }
    
    echo "  $status\n";
    if ($response && strlen($response) < 200) {
        echo "  Response: " . substr($response, 0, 100) . "\n";
    }
    echo "\n";
    
    $results[] = [
        'test' => $description,
        'url' => $url,
        'method' => $method,
        'status' => $httpCode,
        'success' => $success,
    ];
    
    return $success;
}

echo "=== Payments/Collect Page API Tests ===\n\n";

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

// Test 1: Tenant Units
testEndpoint('GET', '/api/v1/tenant-units?per_page=200&status=active&include=tenant,unit,unit.property', 
    'Tenant Units Endpoint (Auth Required)', 
    ['Accept: application/json']);

// Test 2: Payment Methods
testEndpoint('GET', '/api/v1/payment-methods?only_active=1&per_page=100', 
    'Payment Methods Endpoint (Auth Required)', 
    ['Accept: application/json']);

// Test 3: Currencies
testEndpoint('GET', '/api/v1/currencies?only_active=1', 
    'Currencies Endpoint (Auth Required)', 
    ['Accept: application/json']);

// Test 4: Unified Payments (POST for creating)
testEndpoint('POST', '/api/v1/unified-payments', 
    'Unified Payments Create Endpoint (Auth Required)', 
    ['Content-Type: application/json', 'Accept: application/json'],
    json_encode(['payment_type' => 'rent', 'amount' => 100]));

// Test 5: Pending Charges (example with ID 1)
testEndpoint('GET', '/api/v1/tenant-units/1/pending-charges', 
    'Pending Charges Endpoint (Auth Required)', 
    ['Accept: application/json']);

// Summary
echo "=== Test Summary ===\n\n";
$passed = 0;
$total = count($results);

foreach ($results as $result) {
    $icon = $result['success'] ? '✅' : '❌';
    echo "$icon {$result['test']} - Status: {$result['status']}\n";
    if ($result['success']) $passed++;
}

echo "\n";
echo "Results: $passed / $total endpoints accessible\n";

if ($passed == $total) {
    echo "✅ All endpoints are accessible (some require authentication)\n";
} else {
    echo "⚠️ Some endpoints returned 404 - routes may not be registered\n";
}

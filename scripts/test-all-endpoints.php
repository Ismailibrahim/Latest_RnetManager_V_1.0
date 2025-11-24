<?php

/**
 * Comprehensive API Endpoint Tester
 * Tests all main API endpoints one by one
 */

// Get base URL from environment or use default
$baseUrl = getenv('API_BASE_URL') ?: 'http://localhost:8000';
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
    $color = 'gray';
    
    if ($error) {
        $status = "ERROR: $error";
        $color = 'red';
        $success = false;
    } elseif ($httpCode == 200 || $httpCode == 201) {
        $status = "✅ SUCCESS ($httpCode)";
        $color = 'green';
        $success = true;
    } elseif ($httpCode == 404) {
        $status = "❌ NOT FOUND (404)";
        $color = 'red';
        $success = false;
    } elseif ($httpCode == 401) {
        $status = "⚠️ UNAUTHORIZED (401) - Auth required";
        $color = 'yellow';
        $success = true; // Expected for protected routes
    } elseif ($httpCode == 422) {
        $status = "⚠️ VALIDATION ERROR (422) - Expected for POST without data";
        $color = 'yellow';
        $success = true; // Expected
    } elseif ($httpCode >= 500) {
        $status = "❌ SERVER ERROR ($httpCode)";
        $color = 'red';
        $success = false;
    } else {
        $status = "⚠️ Status: $httpCode";
        $color = 'yellow';
        $success = false;
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
        'response' => substr($response, 0, 100)
    ];
    
    return $success;
}

echo "=== API Endpoint Test Suite ===\n\n";
echo "Waiting for server to be ready...\n";
sleep(2);

// Test 1: Health Check
testEndpoint('GET', '/health', 'Health Check Endpoint');

// Test 2: API v1 Root
testEndpoint('GET', '/api/v1/', 'API v1 Root Endpoint');

// Test 3: Currency Test Route
testEndpoint('GET', '/api/v1/currencies-test', 'Currency Test Route');

// Test 4: Simple Test Route
testEndpoint('GET', '/api/v1/test-simple', 'Simple Test Route');

// Test 5: Currencies Endpoint (requires auth)
testEndpoint('GET', '/api/v1/currencies', 'Currencies Endpoint (Auth Required)');

// Test 6: Payment Methods (requires auth)
testEndpoint('GET', '/api/v1/payment-methods', 'Payment Methods (Auth Required)');

// Test 7: Properties (requires auth)
testEndpoint('GET', '/api/v1/properties', 'Properties (Auth Required)');

// Test 8: Units (requires auth)
testEndpoint('GET', '/api/v1/units', 'Units (Auth Required)');

// Test 9: Tenants (requires auth)
testEndpoint('GET', '/api/v1/tenants', 'Tenants (Auth Required)');

// Test 10: Login endpoint (should work)
testEndpoint('POST', '/api/v1/auth/login', 'Login Endpoint (POST)', 
    ['Content-Type: application/json'], 
    json_encode(['email' => 'test@test.com', 'password' => 'test']));

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
echo "Results: $passed / $total tests passed\n";

if ($passed == $total) {
    echo "✅ All tests passed!\n";
    exit(0);
} else {
    echo "⚠️ Some tests failed or require authentication\n";
    exit(1);
}


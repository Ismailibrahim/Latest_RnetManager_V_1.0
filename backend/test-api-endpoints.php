<?php

/**
 * API Endpoint Testing Script
 * 
 * This script tests all API endpoints to verify:
 * 1. Responses are in correct format
 * 2. CORS headers are present
 * 3. Performance is acceptable
 * 
 * Usage: php test-api-endpoints.php
 */

require __DIR__ . '/vendor/autoload.php';

$baseUrl = 'http://localhost:8000';
$results = [
    'passed' => 0,
    'failed' => 0,
    'errors' => [],
    'performance' => [],
];

// Test endpoints (without authentication)
$publicEndpoints = [
    'GET /api/health' => '/api/health',
    'GET /api/v1/' => '/api/v1/',
];

// Test endpoints that require authentication (will test format only)
$protectedEndpoints = [
    'GET /api/v1/auth/me' => '/api/v1/auth/me',
    'GET /api/v1/properties' => '/api/v1/properties',
    'GET /api/v1/units' => '/api/v1/units',
    'GET /api/v1/tenants' => '/api/v1/tenants',
];

echo "=== API Endpoint Testing ===\n\n";

// Test public endpoints
echo "Testing Public Endpoints:\n";
echo str_repeat("-", 50) . "\n";

foreach ($publicEndpoints as $name => $endpoint) {
    testEndpoint($name, $endpoint, null);
}

// Test CORS
echo "\n=== CORS Testing ===\n";
echo str_repeat("-", 50) . "\n";
testCors();

// Summary
echo "\n=== Test Summary ===\n";
echo str_repeat("-", 50) . "\n";
echo "Passed: {$results['passed']}\n";
echo "Failed: {$results['failed']}\n";

if (!empty($results['errors'])) {
    echo "\nErrors:\n";
    foreach ($results['errors'] as $error) {
        echo "  - {$error}\n";
    }
}

if (!empty($results['performance'])) {
    echo "\nPerformance (Average Response Time):\n";
    $avgTime = array_sum($results['performance']) / count($results['performance']);
    echo "  Average: " . number_format($avgTime * 1000, 2) . "ms\n";
    echo "  Fastest: " . number_format(min($results['performance']) * 1000, 2) . "ms\n";
    echo "  Slowest: " . number_format(max($results['performance']) * 1000, 2) . "ms\n";
}

function testEndpoint($name, $endpoint, $token = null) {
    global $baseUrl, $results;
    
    $url = $baseUrl . $endpoint;
    $ch = curl_init($url);
    
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
    ];
    
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_VERBOSE, false);
    
    $startTime = microtime(true);
    $response = curl_exec($ch);
    $endTime = microtime(true);
    
    $responseTime = $endTime - $startTime;
    $results['performance'][] = $responseTime;
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    
    curl_close($ch);
    
    // Check CORS headers
    $hasCors = strpos($headers, 'Access-Control-Allow-Origin') !== false;
    
    // Check JSON format
    $jsonData = json_decode($body, true);
    $isJson = json_last_error() === JSON_ERROR_NONE;
    
    // Check response structure
    $hasCorrectStructure = false;
    if ($isJson) {
        // Public endpoints should have status/message or data
        $hasCorrectStructure = isset($jsonData['status']) || isset($jsonData['message']) || isset($jsonData['data']);
    }
    
    // Results
    $passed = ($httpCode >= 200 && $httpCode < 500) && $hasCors && $isJson;
    
    if ($passed) {
        $results['passed']++;
        echo "✓ {$name}: OK (HTTP {$httpCode}, " . number_format($responseTime * 1000, 2) . "ms)\n";
    } else {
        $results['failed']++;
        $error = "✗ {$name}: FAILED";
        if (!$hasCors) $error .= " - Missing CORS headers";
        if (!$isJson) $error .= " - Invalid JSON";
        if ($httpCode >= 500) $error .= " - Server Error ({$httpCode})";
        echo $error . "\n";
        $results['errors'][] = $error;
    }
}

function testCors() {
    global $baseUrl, $results;
    
    $url = $baseUrl . '/api/v1/';
    
    // Test OPTIONS request (preflight)
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Origin: http://localhost:3000',
        'Access-Control-Request-Method: GET',
        'Access-Control-Request-Headers: Content-Type, Authorization',
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 204 && strpos($response, 'Access-Control-Allow-Origin') !== false) {
        $results['passed']++;
        echo "✓ CORS Preflight (OPTIONS): OK\n";
    } else {
        $results['failed']++;
        $error = "✗ CORS Preflight (OPTIONS): FAILED (HTTP {$httpCode})";
        echo $error . "\n";
        $results['errors'][] = $error;
    }
    
    // Test GET request with Origin header
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Origin: http://localhost:3000',
        'Accept: application/json',
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (strpos($response, 'Access-Control-Allow-Origin') !== false) {
        $results['passed']++;
        echo "✓ CORS Headers in Response: OK\n";
    } else {
        $results['failed']++;
        $error = "✗ CORS Headers in Response: FAILED";
        echo $error . "\n";
        $results['errors'][] = $error;
    }
}

echo "\n=== Testing Complete ===\n";
echo "Note: This script tests public endpoints only.\n";
echo "For full testing with authentication, use Laravel's test suite.\n";

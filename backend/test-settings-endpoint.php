<?php

/**
 * Test script to diagnose settings/system endpoint
 * Run: php test-settings-endpoint.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Testing Settings/System Endpoint ===\n\n";

try {
    require __DIR__ . '/vendor/autoload.php';
    echo "✓ Autoload successful\n";
} catch (\Throwable $e) {
    echo "✗ Autoload failed: " . $e->getMessage() . "\n";
    exit(1);
}

try {
    $app = require_once __DIR__ . '/bootstrap/app.php';
    echo "✓ Bootstrap successful\n";
} catch (\Throwable $e) {
    echo "✗ Bootstrap failed: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}

// Test 1: Check if route exists
echo "1. Checking route registration...\n";
try {
    $routes = \Illuminate\Support\Facades\Route::getRoutes();
    $settingsRoute = null;
    foreach ($routes as $route) {
        if (str_contains($route->uri(), 'settings/system') && $route->methods()[0] === 'GET') {
            $settingsRoute = $route;
            echo "   Found route: {$route->methods()[0]} {$route->uri()}\n";
            echo "   Middleware: " . implode(', ', $route->middleware()) . "\n";
            break;
        }
    }
    if (!$settingsRoute) {
        echo "   ✗ Route not found!\n";
    } else {
        echo "   ✓ Route found\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error checking routes: " . $e->getMessage() . "\n";
}

// Test 2: Try to make a request
echo "\n2. Testing request handling...\n";
try {
    $request = \Illuminate\Http\Request::create('/api/v1/settings/system', 'GET', [], [], [], [
        'HTTP_Origin' => 'http://localhost:3000',
        'HTTP_Accept' => 'application/json',
    ]);
    
    $response = $app->handleRequest($request);
    
    if ($response) {
        echo "   ✓ Request handled\n";
        echo "   Status: " . $response->getStatusCode() . "\n";
        echo "   Content-Type: " . $response->headers->get('Content-Type') . "\n";
        echo "   CORS Origin: " . $response->headers->get('Access-Control-Allow-Origin') . "\n";
        
        $content = $response->getContent();
        echo "   Content length: " . strlen($content) . "\n";
        
        if (strlen($content) > 0) {
            $firstChars = substr($content, 0, 100);
            echo "   First 100 chars: " . $firstChars . "\n";
            
            // Try to parse JSON
            $decoded = json_decode($content, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                echo "   ✓ Valid JSON\n";
            } else {
                echo "   ✗ Invalid JSON: " . json_last_error_msg() . "\n";
                echo "   Content preview: " . substr($content, 0, 500) . "\n";
            }
        }
    } else {
        echo "   ✗ Response is null\n";
    }
} catch (\Throwable $e) {
    echo "   ✗ Exception: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "   Trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== Test Complete ===\n";

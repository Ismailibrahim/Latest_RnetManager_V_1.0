<?php
/**
 * Direct OPTIONS Test
 * Run: php test-options-direct.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

echo "=== Testing OPTIONS Request ===\n\n";

// Create OPTIONS request
$request = \Illuminate\Http\Request::create('/api/v1/admin/landlords', 'OPTIONS', [], [], [], [
    'HTTP_ORIGIN' => 'http://localhost:3000',
    'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization',
]);

echo "Request Method: " . $request->getMethod() . "\n";
echo "Request Path: " . $request->path() . "\n";
echo "Request Origin: " . $request->headers->get('Origin') . "\n\n";

try {
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $response = $kernel->handle($request);
    
    echo "✅ Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Content Length: " . strlen($response->getContent()) . "\n\n";
    
    echo "CORS Headers:\n";
    $corsHeaders = [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Credentials',
    ];
    
    foreach ($corsHeaders as $header) {
        $value = $response->headers->get($header);
        if ($value) {
            echo "  ✅ $header: $value\n";
        } else {
            echo "  ❌ $header: MISSING\n";
        }
    }
    
    echo "\nAll Response Headers:\n";
    foreach ($response->headers->all() as $key => $values) {
        echo "  $key: " . implode(', ', $values) . "\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}


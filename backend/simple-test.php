<?php
echo "Script started\n";
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Loading autoload...\n";
require __DIR__ . '/vendor/autoload.php';
echo "Autoload OK\n";

echo "Loading app...\n";
$app = require_once __DIR__ . '/bootstrap/app.php';
echo "App loaded\n";

echo "Creating request...\n";
$request = \Illuminate\Http\Request::create('/api/v1/settings/system', 'GET');
echo "Request created\n";

echo "Handling request...\n";
try {
    $response = $app->handleRequest($request);
    echo "Response status: " . ($response ? $response->getStatusCode() : 'NULL') . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "Done\n";

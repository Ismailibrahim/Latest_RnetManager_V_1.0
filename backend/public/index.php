<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
try {
    /** @var Application $app */
    $app = require_once __DIR__.'/../bootstrap/app.php';
    
    // Capture request
    $request = Request::capture();
    
    // Use Kernel to handle request
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $response = $kernel->handle($request);
    $kernel->terminate($request, $response);
    
    // Send response
    $response->send();
    
} catch (Throwable $e) {
    // Log to both Laravel log and error_log
    $logFile = __DIR__.'/../storage/logs/laravel.log';
    $message = sprintf(
        "[%s] UNCAUGHT EXCEPTION: %s in %s on line %d\nStack trace:\n%s\n",
        date('Y-m-d H:i:s'),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    );
    @file_put_contents($logFile, $message, FILE_APPEND);
    error_log("CAUGHT EXCEPTION: " . get_class($e) . ": " . $e->getMessage());
    
    // Return error response with CORS headers
    if (!headers_sent()) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        http_response_code(500);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
        header('Access-Control-Allow-Credentials: true');
        echo json_encode([
            'message' => 'Internal server error',
            'error' => 'An uncaught exception occurred. Please check the logs.',
            'exception' => config('app.debug') ? $e->getMessage() : null,
            'timestamp' => date('Y-m-d H:i:s'),
        ]);
    } else {
        // Headers already sent - log this
        error_log("Headers already sent when exception occurred!");
    }
}

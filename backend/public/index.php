<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Set error handler to catch fatal errors
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        // Log fatal error
        $logFile = __DIR__.'/../storage/logs/laravel.log';
        $message = sprintf(
            "[%s] FATAL ERROR: %s in %s on line %d\nStack trace:\n%s\n",
            date('Y-m-d H:i:s'),
            $error['message'],
            $error['file'],
            $error['line'],
            (new \Exception())->getTraceAsString()
        );
        @file_put_contents($logFile, $message, FILE_APPEND);
        
        // Generate crash report if possible
        try {
            if (class_exists(\App\Support\CrashReporter::class)) {
                \App\Support\CrashReporter::report(
                    'FATAL_ERROR',
                    $error['message'],
                    [
                        'file' => $error['file'],
                        'line' => $error['line'],
                        'type' => $error['type'],
                    ]
                );
            }
        } catch (\Exception $e) {
            // If crash reporter fails, just log it
            @file_put_contents($logFile, "Failed to generate crash report: " . $e->getMessage() . "\n", FILE_APPEND);
        }
        
        // Return a proper error response if possible
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Internal server error',
                'error' => 'A fatal error occurred. Please check the logs.',
                'timestamp' => date('Y-m-d H:i:s'),
            ]);
        }
    }
});

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
    
    $app->handleRequest(Request::capture());
} catch (Throwable $e) {
    // Log the exception
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
    
    // Generate crash report if possible
    try {
        if (class_exists(\App\Support\CrashReporter::class)) {
            \App\Support\CrashReporter::report(
                'UNCAUGHT_EXCEPTION',
                $e->getMessage(),
                [
                    'exception' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]
            );
        }
    } catch (\Exception $reportError) {
        // If crash reporter fails, just log it
        @file_put_contents($logFile, "Failed to generate crash report: " . $reportError->getMessage() . "\n", FILE_APPEND);
    }
    
    // Return error response
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Internal server error',
            'error' => 'An uncaught exception occurred. Please check the logs.',
            'timestamp' => date('Y-m-d H:i:s'),
        ]);
    }
}

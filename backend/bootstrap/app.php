<?php

use App\Http\Middleware\CorsMiddleware;
use App\Http\Middleware\RequestDiagnosticsMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web([
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
            'custom.cors' => CorsMiddleware::class,
            'diagnostics.request' => RequestDiagnosticsMiddleware::class,
        ]);

        $middleware->appendToGroup('api', CorsMiddleware::class);
        $middleware->appendToGroup('api', RequestDiagnosticsMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Log all exceptions to prevent silent failures
        $exceptions->report(function (Throwable $e) {
            \Log::error('Unhandled exception: ' . $e->getMessage(), [
                'exception' => $e,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Generate crash report for critical errors
            if ($e instanceof \Error || 
                $e instanceof \ParseError || 
                $e instanceof \TypeError ||
                str_contains($e->getMessage(), 'Allowed memory size')) {
                try {
                    if (class_exists(\App\Support\CrashReporter::class)) {
                        \App\Support\CrashReporter::report(
                            'CRITICAL_EXCEPTION',
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
                    // Silently fail if crash reporter has issues
                }
            }
        });

        // Handle database connection errors gracefully
        $exceptions->render(function (Throwable $e, $request) {
            // Handle route not found errors (like missing 'login' route)
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                \Log::warning('Route not found: ' . $e->getMessage());
                
                // For API requests, return JSON instead of redirecting
                if ($request->expectsJson() || $request->is('api/*')) {
                    return response()->json([
                        'message' => 'Authentication required.',
                        'error' => 'Unauthenticated'
                    ], 401);
                }
            }

            // Only handle QueryException if it hasn't been handled by a controller
            // Controllers should handle their own exceptions and return proper responses
            if ($e instanceof \Illuminate\Database\QueryException) {
                // Check if this is an API route that might have its own error handling
                // If so, let it bubble up so the controller can handle it
                if ($request->is('api/v1/payments*')) {
                    // Let the controller handle it - don't catch it here
                    return null;
                }
                
                \Log::error('Database query exception', [
                    'message' => $e->getMessage(),
                    'sql' => $e->getSql() ?? 'N/A',
                    'bindings' => $e->getBindings() ?? [],
                    'code' => $e->getCode(),
                ]);
                
                // Return a proper error response instead of crashing
                if ($request->expectsJson() || $request->is('api/*')) {
                    // Always include error details in the response
                    $errorDetails = [
                        'message' => $e->getMessage(),
                        'code' => $e->getCode(),
                    ];
                    
                    if ($e->getSql()) {
                        $errorDetails['sql'] = $e->getSql();
                        $errorDetails['bindings'] = $e->getBindings();
                    }
                    
                    // Always show the actual error message, not generic one
                    return response()->json([
                        'message' => $e->getMessage(),
                        'error' => $errorDetails,
                        'debug' => config('app.debug'),
                    ], 500);
                }
            }

            // Handle memory exhaustion
            if (str_contains($e->getMessage(), 'Allowed memory size')) {
                \Log::critical('Memory exhaustion detected', [
                    'memory_limit' => ini_get('memory_limit'),
                    'memory_usage' => memory_get_usage(true),
                    'memory_peak' => memory_get_peak_usage(true),
                ]);
            }

            return null; // Let Laravel handle other exceptions normally
        });
    })->create();

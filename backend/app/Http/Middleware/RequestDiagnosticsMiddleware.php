<?php

namespace App\Http\Middleware;

use App\Support\Diagnostics\SystemProbe;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RequestDiagnosticsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->headers->get('X-Request-Id') ?? (string) Str::uuid();

        SystemProbe::putRequestId($requestId);

        Log::withContext([
            'request_id' => $requestId,
            'user_id' => $request->user()?->getAuthIdentifier(),
        ]);

        $request->headers->set('X-Request-Id', $requestId);

        $start = microtime(true);

        // Gracefully handle logging failures - don't break requests if logging fails
        try {
            Log::channel('probe')->info('request.start', SystemProbe::context([
                'route' => $request->route()?->getName(),
                'method' => $request->getMethod(),
                'uri' => $request->fullUrl(),
                'payload_size' => $request->headers->get('Content-Length'),
            ]));
        } catch (\Throwable $logError) {
            // Log to default channel instead, but don't break the request
            \Log::warning('Probe logging failed (request.start): ' . $logError->getMessage());
        }

        try {
            $response = $next($request);
            
            // Ensure response is not null
            if ($response === null) {
                try {
                    Log::channel('probe')->error('request.null_response', SystemProbe::context([
                        'message' => 'Middleware returned null response',
                    ]));
                } catch (\Throwable $logError) {
                    \Log::warning('Probe logging failed (request.null_response): ' . $logError->getMessage());
                }
                $response = response()->json(['error' => 'Internal server error'], 500);
            }
        } catch (Throwable $exception) {
            // Try to log the exception, but don't let logging failures mask the original exception
            try {
                Log::channel('probe')->error('request.exception', SystemProbe::context([
                    'exception' => $exception::class,
                    'message' => $exception->getMessage(),
                ]));
            } catch (\Throwable $logError) {
                \Log::warning('Probe logging failed (request.exception): ' . $logError->getMessage());
            }

            throw $exception;
        }

        $durationMs = (microtime(true) - $start) * 1000;

        // Only set headers if response exists
        if ($response !== null) {
            $response->headers->set('X-Request-Id', $requestId);
        }

        // Ensure response exists before accessing it
        if ($response === null) {
            try {
                Log::channel('probe')->error('request.null_response_finish', SystemProbe::context([
                    'duration_ms' => round($durationMs, 2),
                ]));
            } catch (\Throwable $logError) {
                \Log::warning('Probe logging failed (request.null_response_finish): ' . $logError->getMessage());
            }
            return response()->json(['error' => 'Internal server error'], 500);
        }

        $context = [
            'status' => $response->getStatusCode(),
            'duration_ms' => round($durationMs, 2),
            'memory_peak' => memory_get_peak_usage(true),
        ];

        // Gracefully handle logging failures
        try {
            Log::channel('probe')->info('request.finish', SystemProbe::context($context));
        } catch (\Throwable $logError) {
            \Log::warning('Probe logging failed (request.finish): ' . $logError->getMessage());
        }

        $threshold = (float) env('PROBE_SLOW_REQUEST_THRESHOLD_MS', 1500);

        if ($durationMs > $threshold) {
            try {
                Log::channel('probe')->warning('request.slow', SystemProbe::context($context + [
                    'threshold_ms' => $threshold,
                ]));
            } catch (\Throwable $logError) {
                \Log::warning('Probe logging failed (request.slow): ' . $logError->getMessage());
            }
        }

        return $response;
    }
}



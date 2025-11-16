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

        Log::channel('probe')->info('request.start', SystemProbe::context([
            'route' => $request->route()?->getName(),
            'method' => $request->getMethod(),
            'uri' => $request->fullUrl(),
            'payload_size' => $request->headers->get('Content-Length'),
        ]));

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            Log::channel('probe')->error('request.exception', SystemProbe::context([
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]));

            throw $exception;
        }

        $durationMs = (microtime(true) - $start) * 1000;

        $response->headers->set('X-Request-Id', $requestId);

        $context = [
            'status' => $response->getStatusCode(),
            'duration_ms' => round($durationMs, 2),
            'memory_peak' => memory_get_peak_usage(true),
        ];

        Log::channel('probe')->info('request.finish', SystemProbe::context($context));

        $threshold = (float) env('PROBE_SLOW_REQUEST_THRESHOLD_MS', 1500);

        if ($durationMs > $threshold) {
            Log::channel('probe')->warning('request.slow', SystemProbe::context($context + [
                'threshold_ms' => $threshold,
            ]));
        }

        return $response;
    }
}



<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get allowed origins from environment variable, fallback to localhost for development
        $allowedOriginsEnv = env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000');
        $allowedOrigins = array_filter(array_map('trim', explode(',', $allowedOriginsEnv)));

        $origin = $request->headers->get('Origin');

        if ($request->getMethod() === 'OPTIONS') {
            $response = response()->noContent(204);
        } else {
            /** @var \Symfony\Component\HttpFoundation\Response $response */
            $response = $next($request);
        }

        if ($origin && in_array($origin, $allowedOrigins, true)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Vary', 'Origin');
        }

        return $response;
    }
}


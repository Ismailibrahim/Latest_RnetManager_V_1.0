<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force CORS headers - Simple, direct approach
 * This ALWAYS sets CORS headers for API routes
 */
class ForceCors
{
    public function handle(Request $request, Closure $next): Response
    {
        // OPTIONS requests are handled by route handler - skip here to avoid duplicates
        if ($request->getMethod() === 'OPTIONS') {
            return $next($request);
        }

        // For non-OPTIONS requests, process normally then add CORS headers
        $response = $next($request);

        // Add CORS headers to all API responses
        if ($request->is('api/*')) {
            $origin = $request->headers->get('Origin', 'http://localhost:3000');
            
            $response->headers->set('Access-Control-Allow-Origin', $origin, true);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept', true);
            $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
        }

        return $response;
    }
}


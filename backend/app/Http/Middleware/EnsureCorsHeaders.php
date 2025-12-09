<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensure CORS headers are ALWAYS present on responses
 * This is a failsafe for routes that must have CORS
 */
class EnsureCorsHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle OPTIONS preflight immediately
        if ($request->getMethod() === 'OPTIONS') {
            $origin = $request->headers->get('Origin', '*');
            $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            
            $response = response('', 204);
            $response->headers->set('Access-Control-Allow-Origin', $origin, true);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
            $response->headers->set('Access-Control-Allow-Headers', $requestedHeaders, true);
            $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
            $response->headers->set('Access-Control-Max-Age', '86400', true);
            
            return $response;
        }
        
        $response = $next($request);

        $origin = $request->headers->get('Origin', '*');
        
        // Always set CORS headers, even if already set (force override)
        $response->headers->set('Access-Control-Allow-Origin', $origin, true);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS', true);
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept', true);
        $response->headers->set('Access-Control-Allow-Credentials', 'true', true);
        $response->headers->set('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count, X-Page, X-Per-Page', true);

        return $response;
    }
}

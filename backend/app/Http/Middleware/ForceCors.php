<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Force CORS headers - Enhanced for mobile app support (Flutter)
 * This ALWAYS sets CORS headers for API routes
 */
class ForceCors
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle OPTIONS preflight requests FIRST - before anything else
        if ($request->getMethod() === 'OPTIONS') {
            \Illuminate\Support\Facades\Log::info('ForceCors: Handling OPTIONS request', [
                'path' => $request->path(),
            ]);
            return $this->handlePreflight($request);
        }

        // Log that we're processing the request
        \Illuminate\Support\Facades\Log::info('ForceCors: Processing request', [
            'method' => $request->getMethod(),
            'path' => $request->path(),
            'is_api' => $request->is('api/*'),
        ]);

        // For non-OPTIONS requests, wrap in try-catch to ensure CORS headers are ALWAYS added
        try {
            $response = $next($request);
            
            // Ensure response is not null
            if ($response === null) {
                \Illuminate\Support\Facades\Log::error('ForceCors: Response is null, creating fallback');
                $response = response()->json([
                    'error' => 'Internal server error',
                    'message' => 'Application returned null response'
                ], 500);
            }
            
            \Illuminate\Support\Facades\Log::info('ForceCors: Got response', [
                'status' => $response->getStatusCode(),
                'has_cors_origin' => $response->headers->has('Access-Control-Allow-Origin'),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ForceCors: Exception occurred', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'exception_type' => get_class($e),
            ]);
            
            // CRITICAL: Check if this is a return type error - don't create duplicate response
            // Laravel will handle return type errors, we just need to ensure CORS headers
            if (str_contains($e->getMessage(), 'Return value must be of type')) {
                \Illuminate\Support\Facades\Log::error('ForceCors: Return type error detected - letting Laravel handle it', [
                    'error' => $e->getMessage(),
                ]);
                // Re-throw to let Laravel's exception handler deal with it properly
                throw $e;
            }
            
            // Create error response with CORS headers immediately
            $errorResponse = response()->json([
                'message' => 'An error occurred processing your request.',
                'error' => config('app.debug') ? $e->getMessage() : null,
                'file' => config('app.debug') ? $e->getFile() : null,
                'line' => config('app.debug') ? $e->getLine() : null,
            ], 500, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            $this->addCorsHeaders($errorResponse, $request);
            
            // Return the CORS-enabled error response instead of re-throwing
            // This ensures browser gets CORS headers even on errors
            return $errorResponse;
        }

        // Add CORS headers to ALL API responses - CRITICAL: This must happen
        if ($request->is('api/*')) {
            \Illuminate\Support\Facades\Log::info('ForceCors: Adding CORS headers to API response');
            
            // Ensure response is not null
            if ($response === null) {
                \Illuminate\Support\Facades\Log::error('ForceCors: Response is null! Creating error response.');
                $response = response()->json(['error' => 'Internal server error'], 500);
            }
            
            // CRITICAL: Clean JSON responses to remove any extra content
            $contentType = $response->headers->get('Content-Type', '');
            if (str_contains($contentType, 'application/json')) {
                $content = $response->getContent();
                if (!empty($content)) {
                    // Find JSON boundaries and extract only JSON
                    $jsonStart = strpos($content, '{');
                    $jsonEnd = strrpos($content, '}');
                    
                    if ($jsonStart !== false && $jsonEnd !== false && $jsonEnd > $jsonStart) {
                        $jsonOnly = substr($content, $jsonStart, $jsonEnd - $jsonStart + 1);
                        
                        // Validate and clean JSON
                        $decoded = json_decode($jsonOnly, true);
                        if (json_last_error() === JSON_ERROR_NONE && $decoded !== null) {
                            $cleanJson = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                            $response->setContent($cleanJson);
                            
                            if ($jsonOnly !== $content) {
                                $removedContent = substr($content, $jsonEnd + 1);
                                \Illuminate\Support\Facades\Log::error('ForceCors: STRAY OUTPUT AFTER JSON - REMOVED', [
                                    'removed_length' => strlen($removedContent),
                                    'removed_content' => $removedContent,
                                    'removed_preview' => substr($removedContent, 0, 200),
                                ]);
                            }
                        } else {
                            \Illuminate\Support\Facades\Log::error('ForceCors: Invalid JSON after extraction', [
                                'json_error' => json_last_error_msg(),
                                'content_preview' => substr($content, 0, 500),
                            ]);
                        }
                    }
                }
            }
            
            $this->addCorsHeaders($response, $request);
            
            // Verify headers were added
            if (!$response->headers->has('Access-Control-Allow-Origin')) {
                \Illuminate\Support\Facades\Log::error('ForceCors: Failed to add CORS headers!');
            }
        }

        // Ensure we always return a valid response
        if ($response === null) {
            \Illuminate\Support\Facades\Log::error('ForceCors: Response is null after processing!');
            $response = response()->json(['error' => 'Internal server error'], 500);
            $this->addCorsHeaders($response, $request);
        }

        return $response;
    }

    /**
     * Handle OPTIONS preflight requests
     */
    protected function handlePreflight(Request $request): Response
    {
        $origin = $this->getAllowedOrigin($request);
        $requestedHeaders = $request->headers->get('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        
        // For file uploads, ensure all necessary headers are allowed
        $allowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-TOKEN, Origin';
        if ($requestedHeaders) {
            // Merge requested headers with standard ones
            $requestedArray = array_map('trim', explode(',', $requestedHeaders));
            $standardArray = array_map('trim', explode(',', $allowedHeaders));
            $mergedHeaders = array_unique(array_merge($standardArray, $requestedArray));
            $allowedHeaders = implode(', ', $mergedHeaders);
        }

        \Illuminate\Support\Facades\Log::info('ForceCors: Handling OPTIONS preflight', [
            'origin' => $origin,
            'requested_headers' => $requestedHeaders,
            'allowed_headers' => $allowedHeaders,
            'path' => $request->path(),
        ]);

        $response = response('', 204);
        $response->header('Access-Control-Allow-Origin', $origin);
        $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->header('Access-Control-Allow-Headers', $allowedHeaders);
        $response->header('Access-Control-Allow-Credentials', 'true');
        $response->header('Access-Control-Max-Age', '86400');
        
        \Illuminate\Support\Facades\Log::info('ForceCors: OPTIONS response created', [
            'has_origin_header' => $response->headers->has('Access-Control-Allow-Origin'),
        ]);

        return $response;
    }

    /**
     * Add CORS headers to response
     * This method FORCE sets headers, overriding any existing ones
     */
    protected function addCorsHeaders(Response $response, Request $request): void
    {
        $origin = $this->getAllowedOrigin($request);
        
        \Illuminate\Support\Facades\Log::info('ForceCors: Setting CORS headers', [
            'origin' => $origin,
            'response_status' => $response->getStatusCode(),
        ]);

        // Force set headers - use replace=true to override any existing headers
        // Use header() method which is more reliable than headers->set()
        $response->header('Access-Control-Allow-Origin', $origin);
        $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        // Include all necessary headers for file uploads and mobile apps
        $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-TOKEN, Origin');
        $response->header('Access-Control-Allow-Credentials', 'true');
        $response->header('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count, X-Page, X-Per-Page');
        $response->header('Access-Control-Max-Age', '86400');
        
        // Ensure Vary header is set for proper caching
        $response->header('Vary', 'Origin');
        
        \Illuminate\Support\Facades\Log::info('ForceCors: CORS headers set', [
            'has_origin' => $response->headers->has('Access-Control-Allow-Origin'),
            'origin_value' => $response->headers->get('Access-Control-Allow-Origin'),
        ]);
    }

    /**
     * Get allowed origin for the request
     * Supports both web and mobile app origins
     */
    protected function getAllowedOrigin(Request $request): string
    {
        $origin = $request->headers->get('Origin');
        
        // If no origin header (mobile apps or server-to-server), allow configured origins
        if (!$origin) {
            $allowedOrigins = $this->getConfiguredOrigins();
            return !empty($allowedOrigins) ? $allowedOrigins[0] : '*';
        }

        // Check if origin is in allowed list
        $allowedOrigins = $this->getConfiguredOrigins();
        
        // Check exact match
        if (in_array($origin, $allowedOrigins, true)) {
            return $origin;
        }

        // Check pattern match (for localhost variations)
        foreach ($allowedOrigins as $allowed) {
            if ($this->matchesPattern($origin, $allowed)) {
                return $origin;
            }
        }

        // For mobile apps (file://, http://localhost, etc.), allow if matches patterns
        if ($this->isMobileOrigin($origin)) {
            return $origin;
        }

        // Default: return first configured origin or the origin itself if in debug mode
        if (config('app.debug')) {
            return $origin;
        }

        return !empty($allowedOrigins) ? $allowedOrigins[0] : '*';
    }

    /**
     * Get configured allowed origins from config
     */
    protected function getConfiguredOrigins(): array
    {
        $origins = config('cors.allowed_origins', []);
        
        // Also check env for comma-separated values
        $envOrigins = env('CORS_ALLOWED_ORIGINS', '');
        if ($envOrigins) {
            $envOrigins = array_filter(array_map('trim', explode(',', $envOrigins)));
            $origins = array_merge($origins, $envOrigins);
        }

        return array_unique(array_filter($origins));
    }

    /**
     * Check if origin matches a pattern
     */
    protected function matchesPattern(string $origin, string $pattern): bool
    {
        // Convert pattern to regex if needed
        if (strpos($pattern, '*') !== false || strpos($pattern, '#') === 0) {
            $regex = str_replace(['*', '#'], ['.*', ''], $pattern);
            if (strpos($regex, '^') !== 0) {
                $regex = '^' . $regex;
            }
            if (strpos($regex, '$') !== strlen($regex) - 1) {
                $regex = $regex . '$';
            }
            return preg_match('#' . $regex . '#', $origin) === 1;
        }

        return $origin === $pattern;
    }

    /**
     * Check if origin is from a mobile app
     */
    protected function isMobileOrigin(string $origin): bool
    {
        // Mobile apps often use file://, http://localhost, or custom schemes
        return strpos($origin, 'file://') === 0
            || strpos($origin, 'http://localhost') === 0
            || strpos($origin, 'http://127.0.0.1') === 0
            || strpos($origin, 'http://192.168.') === 0
            || strpos($origin, 'http://10.') === 0
            || preg_match('#^https?://[a-zA-Z0-9-]+\.local(:\d+)?$#', $origin)
            || preg_match('#^[a-zA-Z][a-zA-Z0-9+.-]+://#', $origin); // Custom scheme (flutter apps)
    }
}


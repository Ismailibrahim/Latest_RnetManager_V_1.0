<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security Headers Middleware
 * 
 * Adds security headers to all responses to protect against common attacks:
 * - XSS Protection
 * - Clickjacking Protection
 * - MIME Type Sniffing Protection
 * - Content Security Policy
 * - Referrer Policy
 * - Permissions Policy
 */
class SecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // X-Frame-Options: Prevent clickjacking attacks
        // SAMEORIGIN allows framing from same origin, DENY blocks all framing
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN', true);

        // X-Content-Type-Options: Prevent MIME type sniffing
        // Forces browser to respect Content-Type header
        $response->headers->set('X-Content-Type-Options', 'nosniff', true);

        // X-XSS-Protection: Enable XSS filtering (legacy, but still useful)
        $response->headers->set('X-XSS-Protection', '1; mode=block', true);

        // Referrer-Policy: Control referrer information
        // strict-origin-when-cross-origin: Send full URL for same-origin, origin only for cross-origin HTTPS
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', true);

        // Permissions-Policy: Control browser features
        // Restrict access to sensitive browser features
        $permissionsPolicy = [
            'geolocation' => 'self',
            'microphone' => 'none',
            'camera' => 'none',
            'payment' => 'self',
            'usb' => 'none',
        ];
        $permissionsPolicyString = implode(', ', array_map(
            fn($feature, $value) => "$feature=($value)",
            array_keys($permissionsPolicy),
            $permissionsPolicy
        ));
        $response->headers->set('Permissions-Policy', $permissionsPolicyString, true);

        // Content-Security-Policy: Prevent XSS and injection attacks
        // Configure based on your application's needs
        $csp = $this->buildContentSecurityPolicy($request);
        if ($csp) {
            $response->headers->set('Content-Security-Policy', $csp, true);
        }

        // Strict-Transport-Security: Force HTTPS (only set for HTTPS requests)
        if ($request->secure() || $request->header('X-Forwarded-Proto') === 'https') {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload',
                true
            );
        }

        return $response;
    }

    /**
     * Build Content Security Policy header
     * 
     * @param Request $request
     * @return string|null
     */
    private function buildContentSecurityPolicy(Request $request): ?string
    {
        // For API endpoints, CSP is less critical but still useful
        // For web routes, stricter CSP should be applied
        
        if ($request->is('api/*')) {
            // Relaxed CSP for API endpoints (they return JSON, not HTML)
            return null; // API endpoints don't need CSP
        }

        // Default CSP for web routes
        // Adjust these directives based on your application's needs
        $directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust based on your needs
            "style-src 'self' 'unsafe-inline'", // Allow inline styles (common in frameworks)
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' " . config('app.url'),
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ];

        return implode('; ', $directives);
    }
}


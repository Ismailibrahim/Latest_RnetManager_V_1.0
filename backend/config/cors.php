<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(
        array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '')))
    ) ?: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        '*', // Allow all origins for mobile apps in development
    ],

    'allowed_origins_patterns' => [
        '#^http://localhost:\d+$#',
        '#^http://127\.0\.0\.1:\d+$#',
        '#^http://192\.168\.\d+\.\d+:\d+$#', // Local network (mobile testing)
        '#^http://10\.\d+\.\d+\.\d+:\d+$#',   // Private network
        '#^https?://[a-zA-Z0-9-]+\.local(:\d+)?$#', // .local domains
        '#^[a-zA-Z][a-zA-Z0-9+.-]+://#', // Custom schemes (Flutter apps)
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,
];


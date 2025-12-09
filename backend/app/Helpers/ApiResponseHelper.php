<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Helper class for standardized API responses
 */
class ApiResponseHelper
{
    /**
     * Create a standardized error response
     *
     * @param string $message User-friendly error message
     * @param int $statusCode HTTP status code
     * @param array $errors Optional validation errors
     * @param \Throwable|null $exception Optional exception for logging
     * @return JsonResponse
     */
    public static function error(
        string $message,
        int $statusCode = 500,
        array $errors = [],
        ?\Throwable $exception = null
    ): JsonResponse {
        // Log exception details server-side
        if ($exception) {
            Log::error('API Error: ' . $message, [
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => config('app.debug') ? $exception->getTraceAsString() : null,
            ]);
        }

        $response = [
            'message' => $message,
        ];

        // Add errors if provided (for validation errors)
        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        // Add debug information only in debug mode
        if (config('app.debug') && config('app.expose_errors', false) && $exception) {
            $response['debug'] = [
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
            ];

            // Add SQL details if it's a database exception
            if (method_exists($exception, 'getSql')) {
                $response['debug']['sql'] = $exception->getSql();
                $response['debug']['bindings'] = $exception->getBindings();
            }
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Create a standardized success response
     *
     * @param mixed $data Response data
     * @param string|null $message Optional success message
     * @param int $statusCode HTTP status code (default: 200)
     * @return JsonResponse
     */
    public static function success($data, ?string $message = null, int $statusCode = 200): JsonResponse
    {
        $response = [];

        if ($message) {
            $response['message'] = $message;
        }

        // If data is already an array with 'data' key, merge it
        if (is_array($data) && isset($data['data'])) {
            $response = array_merge($response, $data);
        } else {
            $response['data'] = $data;
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Create a standardized validation error response
     *
     * @param array $errors Validation errors
     * @param string|null $message Optional custom message
     * @return JsonResponse
     */
    public static function validationError(array $errors, ?string $message = null): JsonResponse
    {
        return self::error(
            $message ?? 'Validation failed',
            422,
            $errors
        );
    }

    /**
     * Create a standardized not found response
     *
     * @param string|null $message Optional custom message
     * @return JsonResponse
     */
    public static function notFound(?string $message = null): JsonResponse
    {
        return self::error(
            $message ?? 'Resource not found',
            404
        );
    }

    /**
     * Create a standardized unauthorized response
     *
     * @param string|null $message Optional custom message
     * @return JsonResponse
     */
    public static function unauthorized(?string $message = null): JsonResponse
    {
        return self::error(
            $message ?? 'Unauthorized',
            401
        );
    }

    /**
     * Create a standardized forbidden response
     *
     * @param string|null $message Optional custom message
     * @return JsonResponse
     */
    public static function forbidden(?string $message = null): JsonResponse
    {
        return self::error(
            $message ?? 'Forbidden',
            403
        );
    }
}


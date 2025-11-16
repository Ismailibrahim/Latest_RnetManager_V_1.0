<?php

namespace Tests\Traits;

use Illuminate\Testing\TestResponse;

/**
 * Trait for making API requests in tests.
 * 
 * This trait provides helper methods for making API requests
 * with common assertions. Use this in your test classes for
 * consistent API testing patterns.
 */
trait MakesApiRequests
{
    /**
     * Make a GET request to an API endpoint and assert success.
     */
    protected function getApi(string $uri, array $headers = []): TestResponse
    {
        return $this->getJson("/api/v1{$uri}", $headers);
    }

    /**
     * Make a POST request to an API endpoint.
     */
    protected function postApi(string $uri, array $data = [], array $headers = []): TestResponse
    {
        return $this->postJson("/api/v1{$uri}", $data, $headers);
    }

    /**
     * Make a PUT request to an API endpoint.
     */
    protected function putApi(string $uri, array $data = [], array $headers = []): TestResponse
    {
        return $this->putJson("/api/v1{$uri}", $data, $headers);
    }

    /**
     * Make a PATCH request to an API endpoint.
     */
    protected function patchApi(string $uri, array $data = [], array $headers = []): TestResponse
    {
        return $this->patchJson("/api/v1{$uri}", $data, $headers);
    }

    /**
     * Make a DELETE request to an API endpoint.
     */
    protected function deleteApi(string $uri, array $headers = []): TestResponse
    {
        return $this->deleteJson("/api/v1{$uri}", [], $headers);
    }

    /**
     * Assert that the response has the standard API structure.
     */
    protected function assertApiResponseStructure(TestResponse $response, array $dataStructure = []): void
    {
        $response->assertOk()
            ->assertJsonStructure([
                'data' => $dataStructure,
            ]);
    }

    /**
     * Assert that the response has pagination structure.
     */
    protected function assertPaginationStructure(TestResponse $response): void
    {
        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => [
                    'first',
                    'last',
                    'prev',
                    'next',
                ],
                'meta' => [
                    'current_page',
                    'from',
                    'last_page',
                    'per_page',
                    'to',
                    'total',
                ],
            ]);
    }

    /**
     * Assert that the response is a validation error.
     */
    protected function assertValidationError(TestResponse $response, string $field = null): void
    {
        $response->assertUnprocessable()
            ->assertJsonStructure([
                'message',
                'errors',
            ]);

        if ($field) {
            $response->assertJsonValidationErrors([$field]);
        }
    }

    /**
     * Assert that the response is unauthorized.
     */
    protected function assertUnauthorized(TestResponse $response): void
    {
        $response->assertUnauthorized();
    }

    /**
     * Assert that the response is forbidden.
     */
    protected function assertForbidden(TestResponse $response): void
    {
        $response->assertForbidden();
    }
}


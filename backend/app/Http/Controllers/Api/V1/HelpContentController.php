<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HelpContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HelpContentController extends Controller
{
    /**
     * Get help content for a specific page
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $pageRoute = $request->query('page', '/');

            // Normalize the route (remove leading/trailing slashes except for root)
            $pageRoute = $pageRoute === '/' ? '/' : trim($pageRoute, '/');
            $pageRoute = $pageRoute === '' ? '/' : '/' . $pageRoute;

            // Try to find help content in database
            $helpContent = HelpContent::findByPageRoute($pageRoute);

            if ($helpContent) {
                return response()->json([
                    'data' => $helpContent->getFormattedContent(),
                ]);
            }

            // If not found, return empty structure (frontend will use fallback)
            return response()->json([
                'data' => [
                    'page' => $pageRoute,
                    'title' => 'Help & Support',
                    'quickGuide' => [],
                    'faqs' => [],
                    'featureHighlights' => [],
                    'relatedPages' => [],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching help content', [
                'page' => $request->query('page'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch help content',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Store new help content (for admin use)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'page_route' => 'required|string|max:255',
                'title' => 'required|string|max:255',
                'content_json' => 'required|array',
                'content_json.quickGuide' => 'nullable|array',
                'content_json.faqs' => 'nullable|array',
                'content_json.featureHighlights' => 'nullable|array',
                'content_json.relatedPages' => 'nullable|array',
            ]);

            // Normalize page route
            $pageRoute = $validated['page_route'];
            $pageRoute = $pageRoute === '/' ? '/' : trim($pageRoute, '/');
            $pageRoute = $pageRoute === '' ? '/' : '/' . $pageRoute;
            $validated['page_route'] = $pageRoute;

            $helpContent = HelpContent::updateOrCreate(
                ['page_route' => $pageRoute],
                [
                    'title' => $validated['title'],
                    'content_json' => $validated['content_json'],
                ]
            );

            return response()->json([
                'data' => $helpContent->getFormattedContent(),
                'message' => 'Help content saved successfully',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing help content', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to save help content',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Update help content (for admin use)
     *
     * @param Request $request
     * @param HelpContent $helpContent
     * @return JsonResponse
     */
    public function update(Request $request, HelpContent $helpContent): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'sometimes|string|max:255',
                'content_json' => 'sometimes|array',
                'content_json.quickGuide' => 'nullable|array',
                'content_json.faqs' => 'nullable|array',
                'content_json.featureHighlights' => 'nullable|array',
                'content_json.relatedPages' => 'nullable|array',
            ]);

            $helpContent->update($validated);

            return response()->json([
                'data' => $helpContent->getFormattedContent(),
                'message' => 'Help content updated successfully',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating help content', [
                'id' => $helpContent->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to update help content',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNationalityRequest;
use App\Http\Requests\UpdateNationalityRequest;
use App\Http\Resources\NationalityResource;
use App\Models\Nationality;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NationalityController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Nationality::class);

        $perPage = $this->resolvePerPage($request, 50);

        $query = Nationality::query()->orderBy('name');

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where('name', 'like', "%{$term}%");
        }

        if ($request->boolean('paginate', true)) {
            $nationalities = $query
                ->paginate($perPage)
                ->withQueryString();

            return NationalityResource::collection($nationalities);
        }

        return NationalityResource::collection($query->get());
    }

    public function store(StoreNationalityRequest $request): NationalityResource
    {
        $nationality = Nationality::query()->create($request->validated());

        return NationalityResource::make($nationality);
    }

    public function show(Nationality $nationality): NationalityResource
    {
        $this->authorize('view', $nationality);

        return NationalityResource::make($nationality);
    }

    public function update(UpdateNationalityRequest $request, Nationality $nationality): NationalityResource
    {
        $nationality->update($request->validated());

        return NationalityResource::make($nationality);
    }

    public function destroy(Nationality $nationality): JsonResponse
    {
        $this->authorize('delete', $nationality);

        if ($nationality->tenants()->exists()) {
            return response()->json([
                'message' => 'Unable to delete nationality because it is in use by existing tenants.',
                'errors' => [
                    'nationality' => ['Nationality is referenced by one or more tenants.'],
                ],
            ], 409);
        }

        $nationality->delete();

        return response()->noContent();
    }
}


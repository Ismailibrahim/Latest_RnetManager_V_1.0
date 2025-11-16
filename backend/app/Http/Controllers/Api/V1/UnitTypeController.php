<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UnitTypeResource;
use App\Models\UnitType;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UnitTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = UnitType::query()
            ->when(
                $request->boolean('only_active', true),
                fn ($builder) => $builder->where('is_active', true)
            )
            ->orderBy('name');

        $types = $request->has('per_page')
            ? $query->paginate($this->resolvePerPage($request, 50))->withQueryString()
            : $query->get();

        return UnitTypeResource::collection($types);
    }

    public function store(Request $request): UnitTypeResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:191', 'unique:unit_types,name'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $unitType = UnitType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
        ]);

        return new UnitTypeResource($unitType);
    }

    public function update(Request $request, UnitType $unitType): UnitTypeResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:191', 'unique:unit_types,name,' . $unitType->id],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $unitType->fill($validated);
        $unitType->save();

        return new UnitTypeResource($unitType);
    }

    public function destroy(UnitType $unitType): Response
    {
        // Optionally soft delete or prevent deletion if referenced; for now try delete
        $unitType->delete();
        return response()->noContent();
    }
}



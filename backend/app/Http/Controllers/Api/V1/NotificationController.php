<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateNotificationRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NotificationController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', Notification::class);

        $perPage = $this->resolvePerPage($request);

        $query = Notification::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->latest();

        if ($request->filled('is_read')) {
            $query->where('is_read', filter_var($request->input('is_read'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('created_at', [$request->input('from'), $request->input('to')]);
        }

        $notifications = $query
            ->paginate($perPage)
            ->withQueryString();

        return NotificationResource::collection($notifications);
    }

    public function show(Notification $notification)
    {
        $this->authorize('view', $notification);

        return NotificationResource::make($notification);
    }

    public function update(UpdateNotificationRequest $request, Notification $notification)
    {
        $notification->update($request->validated());

        return NotificationResource::make($notification);
    }

    public function destroy(Notification $notification): Response
    {
        $this->authorize('delete', $notification);

        $notification->delete();

        return response()->noContent();
    }
}

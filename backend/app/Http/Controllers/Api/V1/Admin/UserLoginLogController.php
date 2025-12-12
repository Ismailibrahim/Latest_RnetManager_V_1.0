<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserLoginLogResource;
use App\Models\UserLoginLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserLoginLogController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        // Only super admins can access login logs
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                abort(403, 'Only super administrators can access login logs.');
            }
            return $next($request);
        });
    }

    /**
     * Display a listing of user login logs.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 50);
            $search = $request->input('search');
            $userId = $request->input('user_id');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');

            $query = UserLoginLog::with([
                    'user:id,first_name,last_name,email,role,landlord_id',
                    'user.landlord:id,company_name'
                ])
                ->latest('logged_in_at');

            // Filter by user
            if ($userId) {
                $query->where('user_id', $userId);
            }

            // Search by user name or email
            if ($search) {
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Filter by date range
            if ($dateFrom) {
                $query->whereDate('logged_in_at', '>=', $dateFrom);
            }

            if ($dateTo) {
                $query->whereDate('logged_in_at', '<=', $dateTo);
            }

            $logs = $query->paginate($perPage);

            return UserLoginLogResource::collection($logs)->response();
        } catch (\Exception $e) {
            \Log::error('Error fetching user login logs: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An error occurred while fetching login logs.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Get login statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));

        $totalLogins = UserLoginLog::whereBetween('logged_in_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->count();

        $uniqueUsers = UserLoginLog::whereBetween('logged_in_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->distinct('user_id')
            ->count('user_id');

        $todayLogins = UserLoginLog::whereDate('logged_in_at', today())
            ->count();

        $uniqueTodayUsers = UserLoginLog::whereDate('logged_in_at', today())
            ->distinct('user_id')
            ->count('user_id');

        // Top users by login count
        $topUsers = UserLoginLog::selectRaw('user_id, COUNT(*) as login_count')
            ->whereBetween('logged_in_at', [$dateFrom, $dateTo . ' 23:59:59'])
            ->with('user:id,first_name,last_name,email')
            ->groupBy('user_id')
            ->orderByDesc('login_count')
            ->limit(10)
            ->get();

        return response()->json([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_logins' => $totalLogins,
            'unique_users' => $uniqueUsers,
            'today_logins' => $todayLogins,
            'unique_today_users' => $uniqueTodayUsers,
            'top_users' => $topUsers->map(function ($log) {
                return [
                    'user_id' => $log->user_id,
                    'user_name' => $log->user ? $log->user->full_name : 'Unknown',
                    'user_email' => $log->user->email ?? null,
                    'login_count' => $log->login_count,
                ];
            }),
        ]);
    }
}


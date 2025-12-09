<?php

namespace App\Http\Controllers\Api\V1;

use App\Constants\ApiConstants;
use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitOccupancyHistory;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OccupancyReportController extends Controller
{
    use AuthorizesRequests;

    /**
     * Generate occupancy report
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $user = $this->getAuthenticatedUser($request);
            $landlordId = $user->isSuperAdmin() ? null : $this->getLandlordIdOrNull($request);

            // Get date range from request (default to current month)
            $startDate = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
            $endDate = $request->input('end_date', Carbon::now()->endOfMonth()->toDateString());
            $startCarbon = Carbon::parse($startDate);
            $endCarbon = Carbon::parse($endDate);

            Log::info('Occupancy report started', [
                'user_id' => $user->id,
                'landlord_id' => $landlordId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            // Overall occupancy metrics
            try {
                $overallMetrics = $this->getOverallMetrics($landlordId);
                Log::debug('Overall metrics completed');
            } catch (\Throwable $e) {
                Log::error('Error in getOverallMetrics', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            // Occupancy by property
            try {
                $occupancyByProperty = $this->getOccupancyByProperty($landlordId);
                Log::debug('Occupancy by property completed');
            } catch (\Throwable $e) {
                Log::error('Error in getOccupancyByProperty', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            // Lease expirations (upcoming and recent)
            try {
                $leaseExpirations = $this->getLeaseExpirations($landlordId, $startCarbon, $endCarbon);
                Log::debug('Lease expirations completed');
            } catch (\Throwable $e) {
                Log::error('Error in getLeaseExpirations', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            // Tenant turnover analysis
            try {
                $tenantTurnover = $this->getTenantTurnover($landlordId, $startCarbon, $endCarbon);
                Log::debug('Tenant turnover completed');
            } catch (\Throwable $e) {
                Log::error('Error in getTenantTurnover', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            // Vacancy trends
            try {
                $vacancyTrends = $this->getVacancyTrends($landlordId, $startCarbon, $endCarbon);
                Log::debug('Vacancy trends completed');
            } catch (\Throwable $e) {
                Log::error('Error in getVacancyTrends', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            // Recent move-ins and move-outs
            try {
                $recentActivity = $this->getRecentActivity($landlordId, ApiConstants::RECENT_ACTIVITY_DAYS);
                Log::debug('Recent activity completed');
            } catch (\Throwable $e) {
                Log::error('Error in getRecentActivity', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                throw $e;
            }

            return response()->json([
                'overall_metrics' => $overallMetrics,
                'occupancy_by_property' => $occupancyByProperty,
                'lease_expirations' => $leaseExpirations,
                'tenant_turnover' => $tenantTurnover,
                'vacancy_trends' => $vacancyTrends,
                'recent_activity' => $recentActivity,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Occupancy report error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id ?? 'unknown',
            ]);

            return response()->json([
                'message' => 'Failed to generate occupancy report.',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while generating the report.',
            ], 500);
        }
    }

    /**
     * Get overall occupancy metrics
     * 
     * Calculates total units, occupied units, vacant units, occupancy rate,
     * and units expiring in the next 30 and 90 days.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @return array
     */
    private function getOverallMetrics(?int $landlordId): array
    {
        // Get total units
        $unitsQuery = Unit::query();
        if ($landlordId !== null) {
            $unitsQuery->where('landlord_id', $landlordId);
        }
        $totalUnits = $unitsQuery->count();

        // Get occupied units (active tenant units) - using DB facade for reliability
        $occupiedQuery = DB::table('tenant_units')
            ->where('status', 'active');
        if ($landlordId !== null) {
            $occupiedQuery->where('landlord_id', $landlordId);
        }
        $occupiedUnits = (int) $occupiedQuery->selectRaw('COUNT(DISTINCT unit_id) as count')->value('count') ?: 0;

        // Get vacant units
        $vacantUnits = max(0, $totalUnits - $occupiedUnits);

        // Calculate occupancy rate
        $occupancyRate = $totalUnits > 0 
            ? round(($occupiedUnits / $totalUnits) * 100, 2)
            : 0;

        // Get units expiring in next 30 days
        $now = Carbon::now();
        $next30Days = $now->copy()->addDays(ApiConstants::LEASE_EXPIRING_SOON_DAYS);
        $expiringQuery = TenantUnit::query()
            ->where('status', 'active')
            ->whereBetween('lease_end', [$now, $next30Days]);
        if ($landlordId !== null) {
            $expiringQuery->where('landlord_id', $landlordId);
        }
        $expiringSoon = $expiringQuery->count();

        // Get units expiring in next 90 days
        $next90Days = $now->copy()->addDays(ApiConstants::LEASE_EXPIRING_UPCOMING_DAYS);
        $expiring90Query = TenantUnit::query()
            ->where('status', 'active')
            ->whereBetween('lease_end', [$now, $next90Days]);
        if ($landlordId !== null) {
            $expiring90Query->where('landlord_id', $landlordId);
        }
        $expiring90Days = $expiring90Query->count();

        return [
            'total_units' => $totalUnits,
            'occupied_units' => $occupiedUnits,
            'vacant_units' => $vacantUnits,
            'occupancy_rate' => $occupancyRate,
            'expiring_30_days' => $expiringSoon,
            'expiring_90_days' => $expiring90Days,
        ];
    }

    /**
     * Get occupancy metrics grouped by property
     * 
     * For each property, calculates total units, occupied units, vacant units,
     * and occupancy rate. Uses eager loading to avoid N+1 queries.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @return array
     */
    private function getOccupancyByProperty(?int $landlordId): array
    {
        $propertiesQuery = Property::query()
            ->withCount(['units as total_units'])
            ->with(['units' => function ($query) {
                $query->select('id', 'property_id', 'unit_number');
            }]);
        
        if ($landlordId !== null) {
            $propertiesQuery->where('landlord_id', $landlordId);
        }

        $properties = $propertiesQuery->get();

        return $properties->map(function ($property) use ($landlordId) {
            // Count active tenant units for this property
            $occupiedQuery = TenantUnit::query()
                ->where('status', 'active')
                ->whereHas('unit', function ($q) use ($property) {
                    $q->where('property_id', $property->id);
                });
            
            if ($landlordId !== null) {
                $occupiedQuery->where('landlord_id', $landlordId);
            }

            // Use get() and count distinct in PHP since whereHas creates a subquery
            $occupiedUnits = (int) $occupiedQuery->get()->pluck('unit_id')->unique()->count();
            $totalUnits = $property->total_units ?? 0;
            $vacantUnits = max(0, $totalUnits - $occupiedUnits);
            $occupancyRate = $totalUnits > 0 
                ? round(($occupiedUnits / $totalUnits) * 100, 2)
                : 0;

            return [
                'property_id' => $property->id,
                'property_name' => $property->name,
                'address' => $property->address,
                'total_units' => $totalUnits,
                'occupied_units' => $occupiedUnits,
                'vacant_units' => $vacantUnits,
                'occupancy_rate' => $occupancyRate,
            ];
        })->toArray();
    }

    /**
     * Get lease expirations within date range
     * 
     * Returns active leases that expire between start and end dates,
     * including tenant and property information.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @param Carbon $startDate Start of date range
     * @param Carbon $endDate End of date range
     * @return array
     */
    private function getLeaseExpirations(?int $landlordId, Carbon $startDate, Carbon $endDate): array
    {
        $expiringQuery = TenantUnit::query()
            ->where('status', 'active')
            ->whereBetween('lease_end', [$startDate, $endDate])
            ->with([
                'tenant:id,full_name',
                'unit:id,unit_number,property_id',
                'unit.property:id,name',
            ])
            ->orderBy('lease_end', 'asc');
        
        if ($landlordId !== null) {
            $expiringQuery->where('landlord_id', $landlordId);
        }

        $expiring = $expiringQuery->get();

        return $expiring->map(function ($tenantUnit) {
            $tenant = $tenantUnit->tenant ?? null;
            $unit = $tenantUnit->unit ?? null;
            $property = $unit->property ?? null;

            $daysUntilExpiry = Carbon::now()->diffInDays($tenantUnit->lease_end, false);

            return [
                'tenant_unit_id' => $tenantUnit->id,
                'property_name' => $property ? $property->name : 'Unknown',
                'unit_number' => $unit ? $unit->unit_number : 'N/A',
                'tenant_name' => $tenant ? $tenant->full_name : 'Unknown',
                'lease_start' => $tenantUnit->lease_start->format('Y-m-d'),
                'lease_end' => $tenantUnit->lease_end->format('Y-m-d'),
                'lease_end_formatted' => $tenantUnit->lease_end->format('d M Y'),
                'days_until_expiry' => $daysUntilExpiry,
                'monthly_rent' => number_format((float) $tenantUnit->monthly_rent, 2),
                'status' => $daysUntilExpiry < 0 ? 'expired' : ($daysUntilExpiry <= 30 ? 'expiring_soon' : 'upcoming'),
            ];
        })->toArray();
    }

    /**
     * Get tenant turnover analysis
     * 
     * Calculates move-ins, move-outs, net change, turnover rate,
     * and average lease duration for the specified date range.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @param Carbon $startDate Start of date range
     * @param Carbon $endDate End of date range
     * @return array
     */
    private function getTenantTurnover(?int $landlordId, Carbon $startDate, Carbon $endDate): array
    {
        // Get move-ins in date range
        $moveInsQuery = UnitOccupancyHistory::query()
            ->where('action', 'move_in')
            ->whereBetween('action_date', [$startDate, $endDate]);
        
        if ($landlordId !== null) {
            $moveInsQuery->whereHas('unit', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            });
        }
        $moveIns = $moveInsQuery->count();

        // Get move-outs in date range
        $moveOutsQuery = UnitOccupancyHistory::query()
            ->where('action', 'move_out')
            ->whereBetween('action_date', [$startDate, $endDate]);
        
        if ($landlordId !== null) {
            $moveOutsQuery->whereHas('unit', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            });
        }
        $moveOuts = $moveOutsQuery->count();

        // Calculate average lease duration (from ended tenant units)
        $endedLeasesQuery = TenantUnit::query()
            ->where('status', 'ended')
            ->whereNotNull('lease_start')
            ->whereNotNull('lease_end');
        
        if ($landlordId !== null) {
            $endedLeasesQuery->where('landlord_id', $landlordId);
        }

        $endedLeases = $endedLeasesQuery->get();
        $totalDuration = $endedLeases->sum(function ($tu) {
            return Carbon::parse($tu->lease_start)->diffInDays(Carbon::parse($tu->lease_end));
        });
        $avgLeaseDuration = $endedLeases->count() > 0 
            ? round($totalDuration / $endedLeases->count())
            : 0;

        return [
            'move_ins' => $moveIns,
            'move_outs' => $moveOuts,
            'net_change' => $moveIns - $moveOuts,
            'turnover_rate' => $moveOuts > 0 ? round(($moveOuts / max($moveIns, 1)) * 100, 2) : 0,
            'average_lease_duration_days' => $avgLeaseDuration,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ];
    }

    /**
     * Get vacancy trends over time
     * 
     * Calculates monthly occupancy rates for each month in the date range.
     * Uses DB facade for reliable DISTINCT COUNT operations.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @param Carbon $startDate Start of date range
     * @param Carbon $endDate End of date range
     * @return array Array of monthly occupancy data
     */
    private function getVacancyTrends(?int $landlordId, Carbon $startDate, Carbon $endDate): array
    {
        // Get monthly vacancy data for the date range
        $months = [];
        $current = $startDate->copy()->startOfMonth();
        $end = $endDate->copy()->endOfMonth();

        while ($current <= $end) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();

            // Convert Carbon dates to strings for all queries
            $monthEndStr = $monthEnd->toDateString();
            $monthStartStr = $monthStart->toDateString();
            
            // Count total units at start of month
            $unitsQuery = Unit::query();
            if ($landlordId !== null) {
                $unitsQuery->where('landlord_id', $landlordId);
            }
            $totalUnits = $unitsQuery->where('created_at', '<=', $monthEndStr)->count();

            // Use DB facade for reliable distinct count
            $occupiedUnits = (int) DB::table('tenant_units')
                ->where('status', 'active')
                ->where('lease_start', '<=', $monthEndStr)
                ->where(function ($q) use ($monthStartStr) {
                    $q->whereNull('lease_end')
                        ->orWhere('lease_end', '>=', $monthStartStr);
                })
                ->when($landlordId !== null, function ($q) use ($landlordId) {
                    $q->where('landlord_id', $landlordId);
                })
                ->selectRaw('COUNT(DISTINCT unit_id) as count')
                ->value('count') ?: 0;
            $vacantUnits = max(0, $totalUnits - $occupiedUnits);
            $occupancyRate = $totalUnits > 0 
                ? round(($occupiedUnits / $totalUnits) * 100, 2)
                : 0;

            $months[] = [
                'month' => $current->format('Y-m'),
                'month_label' => $current->format('M Y'),
                'total_units' => $totalUnits,
                'occupied_units' => $occupiedUnits,
                'vacant_units' => $vacantUnits,
                'occupancy_rate' => $occupancyRate,
            ];

            $current->addMonth();
        }

        return $months;
    }

    /**
     * Get recent activity (move-ins and move-outs)
     * 
     * Returns the most recent move-in and move-out activities within
     * the specified number of days, limited to a maximum number of results.
     *
     * @param int|null $landlordId Filter by landlord ID (null for super admin)
     * @param int $days Number of days to look back (default from ApiConstants)
     * @return array
     */
    private function getRecentActivity(?int $landlordId, int $days = 30): array
    {
        $since = Carbon::now()->subDays($days);

        $activityQuery = UnitOccupancyHistory::query()
            ->where('action_date', '>=', $since)
            ->with([
                'tenant:id,full_name',
                'unit:id,unit_number,property_id',
                'unit.property:id,name',
            ])
            ->orderBy('action_date', 'desc')
            ->limit(ApiConstants::RECENT_ACTIVITY_LIMIT);
        
        if ($landlordId !== null) {
            $activityQuery->whereHas('unit', function ($q) use ($landlordId) {
                $q->where('landlord_id', $landlordId);
            });
        }

        $activities = $activityQuery->get();

        return $activities->map(function ($history) {
            $tenant = $history->tenant ?? null;
            $unit = $history->unit ?? null;
            $property = $unit->property ?? null;

            return [
                'id' => $history->id,
                'action' => $history->action,
                'action_date' => $history->action_date->format('Y-m-d'),
                'action_date_formatted' => $history->action_date->format('d M Y'),
                'property_name' => $property ? $property->name : 'Unknown',
                'unit_number' => $unit ? $unit->unit_number : 'N/A',
                'tenant_name' => $tenant ? $tenant->full_name : 'Unknown',
                'rent_amount' => $history->rent_amount ? number_format((float) $history->rent_amount, 2) : null,
                'lease_start' => $history->lease_start_date ? Carbon::parse($history->lease_start_date)->format('d M Y') : null,
                'lease_end' => $history->lease_end_date ? Carbon::parse($history->lease_end_date)->format('d M Y') : null,
            ];
        })->toArray();
    }
}

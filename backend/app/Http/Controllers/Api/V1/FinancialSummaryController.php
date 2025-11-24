<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\MaintenanceInvoice;
use App\Models\RentInvoice;
use App\Models\TenantUnit;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialSummaryController extends Controller
{
    use AuthorizesRequests;

    public function __invoke(Request $request): JsonResponse
    {
        $landlordId = $this->getLandlordId($request);
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $lastMonth = $now->copy()->subMonth();
        $startOfLastMonth = $lastMonth->copy()->startOfMonth();
        $endOfLastMonth = $lastMonth->copy()->endOfMonth();

        // Get currency symbol (default to MVR)
        $currency = 'MVR';

        // Summary Cards
        $collectedThisMonth = $this->getCollectedThisMonth($landlordId, $startOfMonth, $endOfMonth);
        $collectedLastMonth = $this->getCollectedThisMonth($landlordId, $startOfLastMonth, $endOfLastMonth);
        $collectedChange = $collectedLastMonth > 0 
            ? round((($collectedThisMonth - $collectedLastMonth) / $collectedLastMonth) * 100, 1)
            : 0;

        $outstanding = $this->getOutstanding($landlordId);
        $maintenanceCost = $this->getMaintenanceCostThisMonth($landlordId, $startOfMonth, $endOfMonth);

        // Rent Invoices Pipeline
        $rentInvoices = $this->getRentInvoicesPipeline($landlordId);

        // Ageing Buckets
        $ageingBuckets = $this->getAgeingBuckets($landlordId);

        // Renewal Alerts
        $renewalAlerts = $this->getRenewalAlerts($landlordId);

        // Cash Flow Events
        $cashFlowEvents = $this->getCashFlowEvents($landlordId);

        // Expense Plan (simplified - can be enhanced with budget data)
        $expensePlan = $this->getExpensePlan($landlordId, $startOfMonth, $endOfMonth);

        return response()->json([
            'summary_cards' => [
                [
                    'title' => 'Collected this month',
                    'value' => $this->formatCurrency($collectedThisMonth, $currency),
                    'change' => $collectedChange >= 0 
                        ? "+{$collectedChange}% vs " . $lastMonth->format('M')
                        : "{$collectedChange}% vs " . $lastMonth->format('M'),
                    'icon' => 'Banknote',
                    'tone' => 'success',
                ],
                [
                    'title' => 'Still outstanding',
                    'value' => $this->formatCurrency($outstanding['total'], $currency),
                    'change' => "{$outstanding['count']} leases · ageing {$outstanding['avg_age']}d",
                    'icon' => 'Clock4',
                    'tone' => 'warning',
                ],
                [
                    'title' => 'Total maintenance cost (this month)',
                    'value' => $this->formatCurrency($maintenanceCost['total'], $currency),
                    'change' => $maintenanceCost['budget_percent'] > 0 
                        ? "{$maintenanceCost['budget_percent']}% of monthly budget"
                        : 'No budget set',
                    'icon' => 'PieChart',
                    'tone' => 'info',
                ],
            ],
            'rent_invoices' => $rentInvoices,
            'ageing_buckets' => $ageingBuckets,
            'renewal_alerts' => $renewalAlerts,
            'cash_flow_events' => $cashFlowEvents,
            'expense_plan' => $expensePlan,
            'currency' => $currency,
        ]);
    }

    private function getCollectedThisMonth(int $landlordId, Carbon $start, Carbon $end): float
    {
        // Get paid rent invoices
        $rentCollected = RentInvoice::query()
            ->where('landlord_id', $landlordId)
            ->where('status', 'paid')
            ->whereBetween('paid_date', [$start, $end])
            ->sum(DB::raw('rent_amount + late_fee - COALESCE(advance_rent_applied, 0)'));

        // Get completed financial records (rent type)
        $financialCollected = FinancialRecord::query()
            ->where('landlord_id', $landlordId)
            ->where('type', 'rent')
            ->where('status', 'completed')
            ->whereBetween('paid_date', [$start, $end])
            ->sum('amount');

        return (float) ($rentCollected + $financialCollected);
    }

    private function getOutstanding(int $landlordId): array
    {
        $outstandingInvoices = RentInvoice::query()
            ->where('landlord_id', $landlordId)
            ->whereIn('status', ['generated', 'sent', 'overdue'])
            ->with(['tenantUnit.tenant:id,full_name', 'tenantUnit.unit:id,unit_number,property_id'])
            ->get();

        $total = $outstandingInvoices->sum(function ($invoice) {
            return (float) $invoice->rent_amount + (float) $invoice->late_fee - (float) ($invoice->advance_rent_applied ?? 0);
        });

        $count = $outstandingInvoices->count();
        $avgAge = $outstandingInvoices->avg(function ($invoice) {
            return Carbon::now()->diffInDays($invoice->due_date);
        });

        return [
            'total' => (float) $total,
            'count' => $count,
            'avg_age' => $avgAge ? (int) round($avgAge) : 0,
        ];
    }

    private function getMaintenanceCostThisMonth(int $landlordId, Carbon $start, Carbon $end): array
    {
        $total = MaintenanceInvoice::query()
            ->where('landlord_id', $landlordId)
            ->whereBetween('invoice_date', [$start, $end])
            ->sum('grand_total');

        // Budget would come from settings or a budget table - for now return 0
        $budget = 0;
        $budgetPercent = $budget > 0 ? round(($total / $budget) * 100) : 0;

        return [
            'total' => (float) $total,
            'budget' => $budget,
            'budget_percent' => $budgetPercent,
        ];
    }

    private function getRentInvoicesPipeline(int $landlordId): array
    {
        $invoices = RentInvoice::query()
            ->where('landlord_id', $landlordId)
            ->with([
                'tenantUnit.tenant:id,full_name',
                'tenantUnit.unit:id,unit_number,property_id',
                'tenantUnit.unit.property:id,name',
            ])
            ->orderBy('due_date', 'desc')
            ->limit(20)
            ->get();

        return $invoices->map(function ($invoice) {
            $tenant = $invoice->tenantUnit->tenant ?? null;
            $unit = $invoice->tenantUnit->unit ?? null;
            $property = $unit->property ?? null;

            $tenantName = $tenant ? $tenant->full_name : 'Unknown';
            $unitNumber = $unit ? $unit->unit_number : 'N/A';
            $propertyName = $property ? $property->name : 'Unknown';

            $amount = (float) $invoice->rent_amount + (float) $invoice->late_fee - (float) ($invoice->advance_rent_applied ?? 0);
            
            $status = match ($invoice->status) {
                'paid' => 'paid',
                'overdue' => 'overdue',
                'cancelled' => 'cancelled',
                default => 'partial',
            };

            $balance = match ($invoice->status) {
                'paid' => 'Paid',
                'overdue' => max(0, Carbon::now()->diffInDays($invoice->due_date, false)) . ' days past due',
                default => 'MVR ' . number_format($amount, 2) . ' open',
            };

            $paymentMethod = $invoice->payment_method 
                ? ucfirst(str_replace('_', ' ', $invoice->payment_method))
                : 'Awaiting transfer';

            return [
                'invoice' => $invoice->invoice_number,
                'tenant' => "{$propertyName} · {$unitNumber}",
                'property' => $propertyName,
                'due' => $invoice->due_date->format('d M'),
                'status' => $status,
                'amount' => 'MVR ' . number_format($amount, 2),
                'balance' => $balance,
                'channel' => $paymentMethod,
            ];
        })->toArray();
    }

    private function getAgeingBuckets(int $landlordId): array
    {
        $invoices = RentInvoice::query()
            ->where('landlord_id', $landlordId)
            ->whereIn('status', ['generated', 'sent', 'overdue'])
            ->get();

        $buckets = [
            ['label' => 'Current (< 5d)', 'days' => [0, 5], 'amount' => 0, 'leases' => 0],
            ['label' => 'Day 6 - 15', 'days' => [6, 15], 'amount' => 0, 'leases' => 0],
            ['label' => 'Day 16 - 30', 'days' => [16, 30], 'amount' => 0, 'leases' => 0],
            ['label' => '30+ days', 'days' => [31, 9999], 'amount' => 0, 'leases' => 0],
        ];

        foreach ($invoices as $invoice) {
            $daysPastDue = max(0, Carbon::now()->diffInDays($invoice->due_date, false));
            $amount = (float) $invoice->rent_amount + (float) $invoice->late_fee - (float) ($invoice->advance_rent_applied ?? 0);

            foreach ($buckets as &$bucket) {
                if ($daysPastDue >= $bucket['days'][0] && $daysPastDue <= $bucket['days'][1]) {
                    $bucket['amount'] += $amount;
                    $bucket['leases']++;
                    break;
                }
            }
        }

        return array_map(function ($bucket) {
            return [
                'label' => $bucket['label'],
                'amount' => 'MVR ' . number_format($bucket['amount'], 2),
                'leases' => $bucket['leases'],
                'tone' => match ($bucket['label']) {
                    'Current (< 5d)' => 'success',
                    'Day 6 - 15' => 'warning',
                    default => 'danger',
                },
            ];
        }, $buckets);
    }

    private function getRenewalAlerts(int $landlordId): array
    {
        $now = Carbon::now();
        $next45Days = $now->copy()->addDays(45);

        $tenantUnits = TenantUnit::query()
            ->where('landlord_id', $landlordId)
            ->where('status', 'active')
            ->whereNotNull('lease_end')
            ->whereBetween('lease_end', [$now, $next45Days])
            ->with([
                'tenant:id,full_name',
                'unit:id,unit_number,property_id',
                'unit.property:id,name',
            ])
            ->orderBy('lease_end', 'asc')
            ->limit(10)
            ->get();

        return $tenantUnits->map(function ($tenantUnit) {
            $tenant = $tenantUnit->tenant ?? null;
            $unit = $tenantUnit->unit ?? null;
            $property = $unit->property ?? null;

            $leaseName = $property && $unit 
                ? "{$property->name} · {$unit->unit_number}"
                : 'Unknown Unit';
            $tenantName = $tenant ? $tenant->full_name : 'Unknown Tenant';
            $renewalDate = $tenantUnit->lease_end->format('d M');
            $daysUntilRenewal = Carbon::now()->diffInDays($tenantUnit->lease_end);

            return [
                'lease' => $leaseName,
                'tenant' => $tenantName,
                'renewalDate' => "Renewal on {$renewalDate}",
                'action' => $daysUntilRenewal <= 15 
                    ? 'Send renewal notice'
                    : 'Draft renewal terms',
            ];
        })->toArray();
    }

    private function getCashFlowEvents(int $landlordId): array
    {
        $events = FinancialRecord::query()
            ->where('landlord_id', $landlordId)
            ->where('transaction_date', '>=', Carbon::now()->subDays(30))
            ->orderBy('transaction_date', 'desc')
            ->limit(10)
            ->get();

        return $events->map(function ($record) {
            $isIncome = in_array($record->type, ['rent', 'deposit']);
            $sign = $isIncome ? '+' : '−';
            $amount = abs((float) $record->amount);

            return [
                'date' => $record->transaction_date->format('d M'),
                'label' => $record->description ?: ucfirst($record->type),
                'amount' => "{$sign} MVR " . number_format($amount, 2),
                'detail' => $record->payment_method 
                    ? ucfirst(str_replace('_', ' ', $record->payment_method))
                    : 'Transaction',
                'tone' => $isIncome ? 'incoming' : 'outgoing',
            ];
        })->toArray();
    }

    private function getExpensePlan(int $landlordId, Carbon $start, Carbon $end): array
    {
        // Get maintenance invoices by category (simplified)
        $maintenanceInvoices = MaintenanceInvoice::query()
            ->where('landlord_id', $landlordId)
            ->whereBetween('invoice_date', [$start, $end])
            ->get();

        $totalSpent = $maintenanceInvoices->sum('grand_total');
        
        // Simplified categories - in a real system, these would come from invoice categories or budget settings
        $categories = [
            ['category' => 'Facilities & maintenance', 'allocated' => 380000, 'tone' => 'primary'],
            ['category' => 'Utilities', 'allocated' => 210000, 'tone' => 'info'],
            ['category' => 'Insurance & compliance', 'allocated' => 160000, 'tone' => 'success'],
            ['category' => 'Capital improvements', 'allocated' => 520000, 'tone' => 'muted'],
        ];

        // Distribute spent amount proportionally (simplified)
        $categorySpent = $totalSpent / count($categories);

        return array_map(function ($cat) use ($categorySpent) {
            $spentPercent = $cat['allocated'] > 0 
                ? round(($categorySpent / $cat['allocated']) * 100)
                : 0;

            return [
                'category' => $cat['category'],
                'allocated' => 'MVR ' . number_format($cat['allocated'], 2),
                'spentPercent' => min(100, $spentPercent),
                'tone' => $cat['tone'],
            ];
        }, $categories);
    }

    private function formatCurrency(float $amount, string $currency): string
    {
        return $currency . ' ' . number_format($amount, 2);
    }
}


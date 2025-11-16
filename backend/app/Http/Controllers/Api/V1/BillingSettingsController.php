<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionInvoiceResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BillingSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $relationships = [
            'landlord.subscriptionLimit',
            'landlord.users',
        ];

        $subscriptionInvoicesAvailable = Schema::hasTable('subscription_invoices');

        if ($subscriptionInvoicesAvailable) {
            $relationships[] = 'landlord.subscriptionInvoices';
        }

        $user = $request->user()->loadMissing($relationships);

        $landlord = $user->landlord;

        if (! $landlord) {
            abort(404, 'Landlord not found for the current user.');
        }

        $subscriptionLimit = $landlord->subscriptionLimit;

        $plan = [
            'tier' => $landlord->subscription_tier,
            'name' => Str::headline($landlord->subscription_tier ?? 'unknown'),
            'monthly_price' => $subscriptionLimit?->monthly_price ?? 0,
            'currency' => 'USD',
            'status' => 'active',
            'next_renewal_date' => now()->addMonthNoOverflow()->startOfMonth()->toDateString(),
            'features' => $subscriptionLimit?->features ?? [],
            'limits' => [
                'properties' => $subscriptionLimit?->max_properties,
                'units' => $subscriptionLimit?->max_units,
                'users' => $subscriptionLimit?->max_users,
            ],
        ];

        $usage = [
            $this->buildUsageMetric(
                'properties',
                'Properties live',
                $landlord->properties()->count(),
                $subscriptionLimit?->max_properties,
                'properties'
            ),
            $this->buildUsageMetric(
                'units',
                'Active units',
                $landlord->units()->count(),
                $subscriptionLimit?->max_units,
                'units'
            ),
            $this->buildUsageMetric(
                'users',
                'Team members',
                $landlord->users()->count(),
                $subscriptionLimit?->max_users,
                'users'
            ),
        ];

        $invoices = SubscriptionInvoiceResource::collection(
            $subscriptionInvoicesAvailable
                ? $landlord->subscriptionInvoices()
                    ->orderByDesc('issued_at')
                    ->limit(12)
                    ->get()
                : collect()
        );

        $billingContacts = $landlord->users
            ->filter(fn (User $member): bool => in_array($member->role, [User::ROLE_OWNER, User::ROLE_ADMIN], true))
            ->map(fn (User $member): array => [
                'name' => $member->full_name ?? trim("{$member->first_name} {$member->last_name}"),
                'email' => $member->email,
                'role' => $member->role,
            ])
            ->values()
            ->all();

        return response()->json([
            'plan' => $plan,
            'usage' => $usage,
            'invoices' => $invoices,
            'preferences' => [
                'receipt_emails' => array_values(array_unique(
                    array_filter(array_map(
                        fn (array $contact): ?string => $contact['email'] ?? null,
                        $billingContacts
                    ))
                )),
                'billing_contacts' => $billingContacts,
                'tax_registration' => null,
                'compliance_note' => 'All billing data is encrypted and stored in the ap-south-1 region with nightly backups.',
            ],
            'meta' => [
                'subscription_invoices_available' => $subscriptionInvoicesAvailable,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildUsageMetric(
        string $key,
        string $label,
        int $used,
        ?int $limit,
        string $unit
    ): array {
        $remaining = $limit !== null ? max(0, $limit - $used) : null;

        $helper = $limit === null
            ? 'Unlimited on your current plan'
            : ($remaining === 0
                ? 'You have reached your plan allocation.'
                : sprintf('%d %s remaining on your plan', $remaining, $remaining === 1 ? Str::singular($unit) : $unit)
            );

        return [
            'key' => $key,
            'label' => $label,
            'used' => $used,
            'limit' => $limit,
            'unit' => $unit,
            'helper' => $helper,
        ];
    }
}



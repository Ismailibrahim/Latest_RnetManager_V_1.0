"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarRange,
  FileText,
  Layers,
  RefreshCcw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { formatMVR } from "@/lib/currency";

const formatCurrency = formatMVR;
import { EndLeaseModal } from "@/components/EndLeaseModal";
import { API_BASE_URL } from "@/utils/api-config";

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Former", value: "former" },
  { label: "Pending", value: "pending" },
];

function TenantUnitsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";

  const [tenantName, setTenantName] = useState("");
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [meta, setMeta] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [endLeaseModalOpen, setEndLeaseModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      setTenantName("");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenant() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = payload?.data;
        if (data) {
          setTenantName(data.full_name ?? data.email ?? `Tenant #${tenantId}`);
        }
      } catch {
        // ignore, header fallback will remain generic
      }
    }

    fetchTenant();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantId]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchLeases() {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load tenant-unit assignments.");
        }

        const url = new URL(`${API_BASE_URL}/tenant-units`);
        url.searchParams.set("per_page", "50");

        if (tenantId) {
          url.searchParams.set("tenant_id", tenantId);
        }

        if (statusFilter !== "all") {
          url.searchParams.set("status", statusFilter);
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load tenant-unit records (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setLeases(data);
        setMeta(payload?.meta ?? null);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) {
          return;
        }

        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLeases();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantId, statusFilter, refreshKey]);

  const filteredLeases = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return leases;
    }

      return leases.filter((lease) => {
        const haystack = [
          lease?.tenant?.full_name,
          lease?.tenant?.email,
          lease?.unit?.unit_number,
          lease?.unit?.property?.name,
          lease?.unit?.property_id ? `Property ${lease.unit.property_id}` : null,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());

        return haystack.some((value) => value.includes(query));
      });
  }, [leases, search]);

  const stats = useMemo(() => {
    if (leases.length === 0) {
      return {
        total: 0,
        active: 0,
        endingSoon: 0,
        monthlyRent: 0,
        depositHeld: 0,
      };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return leases.reduce(
      (accumulator, lease) => {
        accumulator.total += 1;

        if (lease?.status === "active") {
          accumulator.active += 1;
          
          // Only sum monthly rent for active leases
          const monthlyRent = Number(lease?.monthly_rent);
          if (!Number.isNaN(monthlyRent)) {
            accumulator.monthlyRent += monthlyRent;
          }
          
          // Only count active leases that are ending soon
          if (lease?.lease_end) {
            const end = new Date(lease.lease_end);
            if (!Number.isNaN(end.valueOf()) && end >= now && end <= thirtyDaysFromNow) {
              accumulator.endingSoon += 1;
            }
          }
        }

        const deposit = Number(lease?.security_deposit_paid);
        if (!Number.isNaN(deposit)) {
          accumulator.depositHeld += deposit;
        }

        return accumulator;
      },
      {
        total: 0,
        active: 0,
        endingSoon: 0,
        monthlyRent: 0,
        depositHeld: 0,
      },
    );
  }, [leases]);

  const hasFilters =
    statusFilter !== "all" ||
    search.trim().length > 0;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setRefreshKey((value) => value + 1);
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleLoadMore = useCallback(async () => {
    if (!pagination.nextUrl) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "Please log in so we can load additional tenant-unit records.",
        );
      }

      const response = await fetch(pagination.nextUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to load more tenant-unit records (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setLeases((previous) => [...previous, ...data]);
      setMeta(payload?.meta ?? null);
      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      setLoadMoreError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination.nextUrl]);

  const handleNavigateBack = () => {
    if (!tenantId) {
      router.push("/tenants");
      return;
    }

    router.push(`/tenants/${tenantId}`);
  };

  const headerTitle = tenantId ? "Tenant assignments" : "Tenant-unit assignments";
  const headerSubtitle = tenantId
    ? `Review every lease linked to ${tenantName || "this tenant"}.`
    : "Track tenant-to-unit assignments across the portfolio.";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back</span>
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Tenant-unit records
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Layers size={22} className="text-primary" />
              {headerTitle}
            </h1>
            <p className="text-sm text-slate-500">
              {headerSubtitle}
            </p>
            {tenantId && tenantName ? (
              <p className="mt-1 text-xs text-slate-400">
                Tenant ID {tenantId} · {tenantName}
              </p>
            ) : null}
          </div>
        </div>

        <Link
          href="/tenant-units/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Users size={16} />
          Assign tenant to unit
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total assignments"
          value={stats.total}
          icon={<Layers size={20} />}
        />
        <SummaryCard
          title="Active leases"
          value={stats.active}
          icon={<FileText size={20} />}
          description={
            stats.total > 0
              ? `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% active`
              : "No leases yet"
          }
        />
        <SummaryCard
          title="Ending soon"
          value={stats.endingSoon}
          icon={<CalendarRange size={20} />}
          description="Within next 30 days"
        />
        <SummaryCard
          title="Monthly rent (MVR)"
          value={stats.monthlyRent > 0 ? formatCurrency(stats.monthlyRent) : "—"}
          icon={<Wallet size={20} />}
          description={
            stats.depositHeld > 0
              ? `Deposits held ${formatCurrency(stats.depositHeld)}`
              : "No deposits recorded"
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by tenant, unit, or property…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : filteredLeases.length === 0 && !loading ? (
          <EmptyState hasFilters={hasFilters} tenantId={tenantId} />
        ) : (
          <>
            <DataDisplay
              data={filteredLeases}
              loading={loading}
              loadingMessage="Fetching tenant-unit assignments…"
              emptyMessage={
                hasFilters
                  ? "No tenant-unit records match your filters"
                  : tenantId
                    ? "This tenant has no recorded leases"
                    : "No tenant-unit assignments yet"
              }
              columns={[
                {
                  key: "tenant",
                  label: "Tenant / Unit",
                  render: (_, item) => {
                    const tenantName = item?.tenant?.full_name ?? `Tenant #${item?.tenant_id}`;
                    const unitNumber = item?.unit?.unit_number ?? `Unit #${item?.unit_id}`;
                    return (
                      <div>
                        <div className="font-semibold text-slate-900">{tenantName}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Layers size={12} />
                          {unitNumber}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "property",
                  label: "Property",
                  render: (_, item) => {
                    const propertyName = item?.unit?.property?.name;
                    const propertyId = item?.unit?.property_id;
                    if (propertyName) {
                      return propertyName;
                    }
                    return propertyId ? `Property #${propertyId}` : "—";
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <LeaseStatusBadge status={value} />,
                },
                {
                  key: "lease_start",
                  label: "Lease Period",
                  render: (_, item) => formatDateRange(item?.lease_start, item?.lease_end),
                },
                {
                  key: "monthly_rent",
                  label: "Monthly Rent",
                  render: (value) => formatCurrency(value),
                },
                {
                  key: "security_deposit_paid",
                  label: "Security Deposit",
                  render: (value) => formatCurrency(value),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      {item?.status === "active" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLease(item);
                            setEndLeaseModalOpen(true);
                          }}
                          className="text-sm font-semibold text-danger transition hover:text-danger/80"
                        >
                          End Lease
                        </button>
                      )}
                      {item?.tenant_id && (
                        <Link
                          href={`/tenants/${item.tenant_id}`}
                          className="text-sm font-semibold text-primary transition hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Tenant →
                        </Link>
                      )}
                      {item?.unit_id && (
                        <Link
                          href={`/units/${item.unit_id}`}
                          className="text-xs font-semibold text-slate-500 transition hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Unit
                        </Link>
                      )}
                    </div>
                  ),
                },
              ]}
              renderCard={(lease) => (
                <LeaseCard
                  lease={lease}
                  onEndLease={() => {
                    setSelectedLease(lease);
                    setEndLeaseModalOpen(true);
                  }}
                />
              )}
              onRowClick={(lease) => {
                if (lease?.tenant_id) {
                  window.location.href = `/tenants/${lease.tenant_id}`;
                }
              }}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>
                Showing {filteredLeases.length} of {leases.length} loaded assignments
                {meta?.total ? ` · ${meta.total} total` : ""}
              </p>

              {pagination.nextUrl ? (
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  {loadMoreError ? (
                    <p className="text-xs text-red-500 sm:order-2 sm:pl-3">
                      {loadMoreError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <RefreshCcw size={16} />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </section>

      <EndLeaseModal
        lease={selectedLease}
        isOpen={endLeaseModalOpen}
        onClose={() => {
          setEndLeaseModalOpen(false);
          setSelectedLease(null);
        }}
        onSuccess={() => {
          setRefreshKey((value) => value + 1);
        }}
      />
    </div>
  );
}

function SummaryCard({ title, value, icon, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function RetroactiveApplyButton({ tenantUnitId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleClick = async () => {
    if (!confirm("Apply advance rent to all eligible existing invoices? This will update invoice statuses and apply advance rent in chronological order.")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in");
      }

      const response = await fetch(
        `${API_BASE_URL}/tenant-units/${tenantUnitId}/retroactive-advance-rent`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Failed to apply advance rent");
      }

      const payload = await response.json();
      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        Applied successfully!
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        title="Apply advance rent to existing invoices that fall within the coverage period"
      >
        {loading ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-600" />
            Applying...
          </>
        ) : (
          <>
            <RefreshCcw size={14} />
            Apply to Existing
          </>
        )}
      </button>
      {error && (
        <div className="absolute top-full left-0 z-10 mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

function LeaseCard({ lease, onEndLease }) {
  const tenantName = lease?.tenant?.full_name ?? `Tenant #${lease?.tenant_id}`;
  const unitNumber = lease?.unit?.unit_number ?? `Unit #${lease?.unit_id}`;
  const propertyName = lease?.unit?.property?.name;
  const propertyId = lease?.unit?.property_id;
  const propertyLabel = propertyName ?? (propertyId ? `Property #${propertyId}` : "Unassigned property");

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tenant
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{tenantName}</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Layers size={14} />
            {unitNumber}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Building2 size={14} />
            {propertyLabel}
          </p>
        </div>
        <LeaseStatusBadge status={lease?.status} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <InfoItem label="Lease dates">
          {formatDateRange(lease?.lease_start, lease?.lease_end)}
        </InfoItem>
        <InfoItem label="Monthly rent">
          {formatCurrency(lease?.monthly_rent)}
        </InfoItem>
        <InfoItem label="Security deposit">
          {formatCurrency(lease?.security_deposit_paid)}
        </InfoItem>
        {lease?.advance_rent_amount > 0 ? (
          <>
            <InfoItem label="Advance rent collected">
              {formatCurrency(lease?.advance_rent_amount)} ({lease?.advance_rent_months} month
              {lease?.advance_rent_months !== 1 ? "s" : ""})
            </InfoItem>
            <InfoItem label="Advance rent used">
              {formatCurrency(lease?.advance_rent_used ?? 0)}
            </InfoItem>
            <InfoItem label="Advance rent remaining">
              <span className={lease?.advance_rent_remaining > 0 ? "font-semibold text-emerald-600" : "text-slate-600"}>
                {formatCurrency(lease?.advance_rent_remaining ?? 0)}
              </span>
            </InfoItem>
            {lease?.advance_rent_collected_date ? (
              <InfoItem label="Collected on">
                {new Date(lease.advance_rent_collected_date).toLocaleDateString()}
              </InfoItem>
            ) : null}
          </>
        ) : (
          <InfoItem label="Advance rent">
            <span className="text-slate-400">Not collected</span>
          </InfoItem>
        )}
      </dl>

      {lease?.advance_rent_amount > 0 && lease?.advance_rent_remaining > 0 && lease?.lease_start ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Advance Rent Coverage
              </p>
              <p className="mt-1 text-sm text-blue-900">
                Covers months 1-{lease?.advance_rent_months} of lease period
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {formatCurrency(lease?.advance_rent_remaining)} available for invoices
              </p>
              {lease?.advance_rent_used > 0 ? (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.min(100, ((lease?.advance_rent_used ?? 0) / (lease?.advance_rent_amount ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-blue-600">
                    {Math.round(((lease?.advance_rent_used ?? 0) / (lease?.advance_rent_amount ?? 1)) * 100)}% used
                  </p>
                </div>
              ) : null}
            </div>
            {lease?.status === "active" && (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/advance-rent/collect?tenantUnitId=${lease.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-200"
                >
                  <Wallet size={14} />
                  Collect More
                </Link>
                <RetroactiveApplyButton tenantUnitId={lease.id} onSuccess={() => window.location.reload()} />
              </div>
            )}
          </div>
        </div>
      ) : lease?.status === "active" && (!lease?.advance_rent_amount || lease?.advance_rent_amount === 0) ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Advance Rent
              </p>
              <p className="mt-1 text-sm text-slate-700">
                No advance rent collected yet
              </p>
            </div>
            <Link
              href={`/advance-rent/collect?tenantUnitId=${lease.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/20"
            >
              <Wallet size={14} />
              Collect
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          {lease?.status === "active" && onEndLease && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEndLease();
              }}
              className="text-sm font-semibold text-danger transition hover:text-danger/80"
            >
              End Lease
            </button>
          )}
          {lease?.tenant_id ? (
            <Link
              href={`/tenants/${lease.tenant_id}`}
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              View tenant →
            </Link>
          ) : null}
          {lease?.unit_id ? (
            <Link
              href={`/units/${lease.unit_id}`}
              className="text-xs font-semibold text-slate-500 transition hover:text-primary"
            >
              View unit
            </Link>
          ) : null}
          {propertyId ? (
            <Link
              href={`/properties/${propertyId}`}
              className="text-xs font-semibold text-slate-500 transition hover:text-primary"
            >
              View property
            </Link>
          ) : null}
        </div>
        <span className="text-xs text-slate-400">ID {lease?.id}</span>
      </div>
    </article>
  );
}

function InfoItem({ label, children }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{children ?? "—"}</dd>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching tenant-unit assignments…
      </p>
      <p className="text-xs text-slate-500">
        This may take a moment if the API needs to wake up.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load tenant-unit assignments
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Make sure you are logged in and the API server is running at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {API_BASE_URL}
          </code>
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <RefreshCcw size={16} />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters, tenantId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Layers size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters
            ? "No tenant-unit records match your filters"
            : tenantId
              ? "This tenant has no recorded leases"
              : "No tenant-unit assignments yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Assign a tenant to a unit to start tracking lease activity."}
        </p>
      </div>
      <Link
        href="/tenant-units/new"
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Users size={16} />
        Create assignment
      </Link>
    </div>
  );
}

function LeaseStatusBadge({ status }) {
  const normalized = status ? status.toLowerCase() : "unknown";

  const styles = {
    active: "bg-success/10 text-success",
    inactive: "bg-warning/10 text-warning",
    former: "bg-danger/10 text-danger",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-slate-200 text-slate-700",
    ended: "bg-slate-200 text-slate-700",
    cancelled: "bg-danger/10 text-danger",
    terminated: "bg-danger/10 text-danger",
    unknown: "bg-slate-200 text-slate-600",
  };

  const label =
    normalized === "unknown"
      ? "Unknown"
      : normalized
          .split(/[_-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        styles[normalized] ?? styles.unknown
      }`}
    >
      {label}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "N/A";
  }

  return date.toLocaleDateString();
}

function formatDateRange(start, end) {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return `${startLabel} → ${endLabel}`;
}

export default function TenantUnitsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm	text-slate-500">Loading tenant units…</div>}>
      <TenantUnitsPageContent />
    </Suspense>
  );
}

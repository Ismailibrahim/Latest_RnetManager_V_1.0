"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { formatMVR } from "@/lib/currency";

const formatCurrency = formatMVR;
import { API_BASE_URL } from "@/utils/api-config";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "partially_used", label: "Partially Used" },
  { value: "fully_used", label: "Fully Used" },
];

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function AdvanceRentPageContent() {
  const [tenantUnits, setTenantUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [meta, setMeta] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchTenantUnits() {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in to view advance rent information.");
        }

        const url = new URL(`${API_BASE_URL}/tenant-units`);
        url.searchParams.set("per_page", "50");

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
            `Unable to load tenant units (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        // Filter to only show tenant units with advance rent
        const data = payload?.data ?? [];
        const filteredData = data.filter((tu) => tu.advance_rent_amount > 0);

        setTenantUnits(filteredData);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
        setMeta(payload?.meta ?? null);
        setError(null);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError(err.message ?? "Failed to load advance rent information.");
          setTenantUnits([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...tenantUnits];

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((tu) => {
        const tenantName = tu.tenant?.full_name?.toLowerCase() ?? "";
        const unitNumber = tu.unit?.unit_number?.toLowerCase() ?? "";
        const propertyName = tu.unit?.property?.name?.toLowerCase() ?? "";
        return (
          tenantName.includes(searchLower) ||
          unitNumber.includes(searchLower) ||
          propertyName.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((tu) => {
        const remaining = tu.advance_rent_remaining ?? 0;
        const used = tu.advance_rent_used ?? 0;
        const total = tu.advance_rent_amount ?? 0;

        if (statusFilter === "fully_used") {
          return remaining === 0 && used > 0;
        } else if (statusFilter === "partially_used") {
          return remaining > 0 && used > 0;
        } else if (statusFilter === "available") {
          return used === 0 && total > 0;
        }
        return true;
      });
    }

    // Sort by collected date (most recent first), then by remaining amount (highest first)
    filtered.sort((a, b) => {
      const dateA = a.advance_rent_collected_date
        ? new Date(a.advance_rent_collected_date).getTime()
        : 0;
      const dateB = b.advance_rent_collected_date
        ? new Date(b.advance_rent_collected_date).getTime()
        : 0;

      if (dateB !== dateA) {
        return dateB - dateA;
      }

      const remainingA = a.advance_rent_remaining ?? 0;
      const remainingB = b.advance_rent_remaining ?? 0;
      return remainingB - remainingA;
    });

    return filtered;
  }, [tenantUnits, search, statusFilter]);

  function calculateCoveragePeriod(tenantUnit) {
    if (!tenantUnit.advance_rent_collected_date || !tenantUnit.lease_start) {
      return null;
    }

    const leaseStart = new Date(tenantUnit.lease_start);
    const collectedDate = new Date(tenantUnit.advance_rent_collected_date);
    const startDate = collectedDate > leaseStart ? collectedDate : leaseStart;

    const months = tenantUnit.advance_rent_months ?? 0;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1); // Last day of the last covered month

    return { start: startDate, end: endDate };
  }

  function getStatusBadge(tenantUnit) {
    const remaining = tenantUnit.advance_rent_remaining ?? 0;
    const used = tenantUnit.advance_rent_used ?? 0;
    const total = tenantUnit.advance_rent_amount ?? 0;

    if (remaining === 0 && used > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          <XCircle className="h-3 w-3" />
          Fully Used
        </span>
      );
    } else if (remaining > 0 && used > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
          <TrendingDown className="h-3 w-3" />
          Partially Used
        </span>
      );
    } else if (used === 0 && total > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Available
        </span>
      );
    }

    return null;
  }

  function calculateUsagePercentage(tenantUnit) {
    const used = tenantUnit.advance_rent_used ?? 0;
    const total = tenantUnit.advance_rent_amount ?? 0;
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-3 text-sm font-medium text-red-700 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasResults = filteredAndSortedData.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Advance Rent</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track and manage advance rent payments across all tenant units
          </p>
        </div>
        <Link
          href="/advance-rent/collect"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Collect Advance Rent
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tenant, unit, or property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.value === "all" ? filter.label : filter.label.replace("All ", "")}
              </option>
            ))}
          </select>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasResults ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {search || statusFilter !== "all"
              ? "No matching advance rent records"
              : "No advance rent records"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Start by collecting advance rent from a tenant"}
          </p>
          {!search && statusFilter === "all" && (
            <Link
              href="/advance-rent/collect"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Collect Advance Rent
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedData.map((tenantUnit) => {
            const coveragePeriod = calculateCoveragePeriod(tenantUnit);
            const usagePercent = calculateUsagePercentage(tenantUnit);

            return (
              <div
                key={tenantUnit.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/tenant-units?tenantId=${tenantUnit.tenant_id}`}
                          className="text-lg font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {tenantUnit.tenant?.full_name ?? `Tenant #${tenantUnit.tenant_id}`}
                        </Link>
                        <p className="mt-1 text-sm text-slate-600">
                          {tenantUnit.unit?.property?.name ?? "Property"} - Unit{" "}
                          {tenantUnit.unit?.unit_number ?? tenantUnit.unit_id}
                        </p>
                      </div>
                      {getStatusBadge(tenantUnit)}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Total Collected</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {formatCurrency(tenantUnit.advance_rent_amount)}
                        </p>
                        {tenantUnit.advance_rent_months && (
                          <p className="mt-1 text-xs text-slate-500">
                            ({tenantUnit.advance_rent_months} month
                            {tenantUnit.advance_rent_months !== 1 ? "s" : ""})
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">Amount Used</p>
                        <p className="mt-1 text-lg font-semibold text-amber-600">
                          {formatCurrency(tenantUnit.advance_rent_used ?? 0)}
                        </p>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-amber-500"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{usagePercent}% used</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">Amount Remaining</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-600">
                          {formatCurrency(tenantUnit.advance_rent_remaining ?? 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">Collected Date</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(tenantUnit.advance_rent_collected_date)}
                        </p>
                      </div>
                    </div>

                    {coveragePeriod && (
                      <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                        <CalendarRange className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Coverage Period:</span>{" "}
                          {formatDate(coveragePeriod.start.toISOString())} →{" "}
                          {formatDate(coveragePeriod.end.toISOString())}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      <Link
                        href={`/tenant-units?tenantId=${tenantUnit.tenant_id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Lease Details →
                      </Link>
                      {tenantUnit.advance_rent_remaining > 0 && (
                        <Link
                          href={`/advance-rent/collect?tenantUnitId=${tenantUnit.id}`}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Collect More →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasResults && (
        <footer className="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          Showing {filteredAndSortedData.length} advance rent record
          {filteredAndSortedData.length === 1 ? "" : "s"}
          {meta?.total ? ` · ${meta.total} total` : ""}
        </footer>
      )}
    </div>
  );
}

export default function AdvanceRentPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>}>
      <AdvanceRentPageContent />
    </Suspense>
  );
}


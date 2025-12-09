"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Search,
  AlertCircle,
  Plus,
  RefreshCcw,
  Building2,
  DoorOpen,
  DoorClosed,
  Wallet,
  Trash2,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency-formatter";

const occupancyFilters = [
  { label: "All occupancy states", value: "all" },
  { label: "Occupied", value: "occupied" },
  { label: "Vacant", value: "vacant" },
];

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [occupancyFilter, setOccupancyFilter] = useState("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [propertiesError, setPropertiesError] = useState(null);
  const [propertiesRefreshKey, setPropertiesRefreshKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnits() {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load your units.",
          );
        }

        const url = new URL(`${API_BASE_URL}/units`);
        url.searchParams.set("per_page", "50");

        if (propertyFilter !== "all") {
          url.searchParams.set("property_id", propertyFilter);
        }

        if (occupancyFilter !== "all") {
          url.searchParams.set(
            "is_occupied",
            occupancyFilter === "occupied" ? "true" : "false",
          );
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
            `Unable to load units (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setUnits(data);
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
        if (!isMounted) {
          return;
        }

        setLoading(false);
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [propertyFilter, occupancyFilter, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchProperties() {
      setPropertiesError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          return;
        }

        const url = new URL(`${API_BASE_URL}/properties`);
        url.searchParams.set("per_page", "100");

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
            `Unable to load properties (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();

        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setPropertyOptions(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) {
          return;
        }

        setPropertiesError(err.message);
      }
    }

    fetchProperties();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [propertiesRefreshKey]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setFlashMessage(null);
    }, 3200);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const propertySelectOptions = useMemo(() => {
    const map = new Map();

    propertyOptions.forEach((property) => {
      map.set(
        String(property.id),
        property.name ?? `Property #${property.id ?? "?"}`,
      );
    });

    units.forEach((unit) => {
      const propertyId = unit?.property?.id;
      const propertyName = unit?.property?.name;

      if (!propertyId) {
        return;
      }

      const key = String(propertyId);

      if (!map.has(key)) {
        map.set(key, propertyName ?? `Property #${propertyId}`);
      }
    });

    const options = Array.from(map.entries())
      .sort((a, b) =>
        a[1].localeCompare(b[1], undefined, { sensitivity: "base" }),
      )
      .map(([value, label]) => ({ value, label }));

    return [{ value: "all", label: "All properties" }, ...options];
  }, [propertyOptions, units]);

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query.length === 0) {
      return units;
    }

    return units.filter((unit) => {
      const haystack = [
        unit?.unit_number,
        unit?.property?.name,
        unit?.unit_type?.name,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystack.some((value) => value.includes(query));
    });
  }, [units, search]);

  const stats = useMemo(() => {
    const totals = filteredUnits.reduce(
      (accumulator, unit) => {
        accumulator.total += 1;

        if (unit?.is_occupied) {
          accumulator.occupied += 1;
        }

        const rent = Number(unit?.rent_amount);
        const currency = (unit?.currency || 'MVR').toUpperCase();

        if (!Number.isNaN(rent) && rent > 0) {
          // Sum by currency - no conversion, just separate totals
          if (currency === 'MVR') {
            accumulator.rentSumMVR += rent;
            accumulator.rentCountMVR += 1;
          } else if (currency === 'USD') {
            accumulator.rentSumUSD += rent;
            accumulator.rentCountUSD += 1;
          } else {
            // For other currencies, add to MVR as default
            accumulator.rentSumMVR += rent;
            accumulator.rentCountMVR += 1;
          }
          accumulator.rentCount += 1;
        }

        return accumulator;
      },
      { total: 0, occupied: 0, rentSumMVR: 0, rentSumUSD: 0, rentCount: 0, rentCountMVR: 0, rentCountUSD: 0 },
    );

    return {
      total: totals.total,
      occupied: totals.occupied,
      vacant: Math.max(totals.total - totals.occupied, 0),
      occupancyRate:
        totals.total > 0
          ? Math.round((totals.occupied / totals.total) * 100)
          : 0,
      totalRentMVR: totals.rentSumMVR,
      totalRentUSD: totals.rentSumUSD,
      rentTracked: totals.rentCount,
      rentCountMVR: totals.rentCountMVR,
      rentCountUSD: totals.rentCountUSD,
    };
  }, [filteredUnits]);

  const hasFilters =
    propertyFilter !== "all" ||
    occupancyFilter !== "all" ||
    search.trim().length > 0;

  const handleResetFilters = () => {
    setSearch("");
    setPropertyFilter("all");
    setOccupancyFilter("all");
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleLoadMore = async () => {
    if (!pagination.nextUrl) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "No API token found. Log in first so we can load additional units.",
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
          `Unable to load more units (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setUnits((previous) => [...previous, ...data]);
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
  };

  const handleDelete = async (unitId) => {
    if (!unitId || deletingId !== null) {
      return;
    }

    const unit = units.find((item) => item.id === unitId);
    const unitNumber = unit?.unit_number;
    const propertyName = unit?.property?.name;
    const labelParts = [];

    if (unitNumber) {
      labelParts.push(unitNumber);
    }

    if (propertyName) {
      labelParts.push(propertyName);
    }

    const label = labelParts.length > 0 ? labelParts.join(" • ") : `Unit #${unitId}`;

    const confirmed = window.confirm(
      `Delete ${label}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(unitId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before deleting units.");
      }

      const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ?? `Unable to delete unit (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setUnits((previous) => previous.filter((item) => item.id !== unitId));
      setMeta((previous) =>
        previous
          ? {
            ...previous,
            total: Math.max((previous.total ?? 1) - 1, 0),
          }
          : previous,
      );
      setFlashMessage({ type: "success", text: "Unit deleted." });
    } catch (err) {
      setFlashMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers size={24} className="text-primary" />
            Units
          </h1>
          <p className="text-sm text-slate-600">
            Keep track of every space across your portfolio. Filter by property
            or occupancy to focus on the units that need attention.
          </p>
        </div>

        <Link
          href="/units/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus size={16} />
          Add unit
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total units"
          value={stats.total}
          icon={<Layers size={20} />}
        />
        <SummaryCard
          title="Occupied"
          value={stats.occupied}
          icon={<DoorOpen size={20} />}
          description={
            stats.occupancyRate > 0
              ? `${stats.occupancyRate}% occupancy`
              : "No active leases"
          }
        />
        <SummaryCard
          title="Vacant"
          value={stats.vacant}
          icon={<DoorClosed size={20} />}
          description={
            stats.vacant > 0 ? "Ready to lease" : "All units occupied"
          }
        />
        <RentSummaryCard
          totalRentMVR={stats.totalRentMVR}
          totalRentUSD={stats.totalRentUSD}
          rentCountMVR={stats.rentCountMVR}
          rentCountUSD={stats.rentCountUSD}
          rentTracked={stats.rentTracked}
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
              placeholder="Search by unit number, property, or type..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {propertySelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={occupancyFilter}
            onChange={(event) => setOccupancyFilter(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {occupancyFilters.map((option) => (
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

        {propertiesError ? (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <p className="text-red-500">
              {propertiesError} — filters limited to loaded units.
            </p>
            <button
              type="button"
              onClick={() => setPropertiesRefreshKey((v) => v + 1)}
              className="rounded border border-slate-200 px-2 py-1 font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Try again
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div
            className={`flex items-center gap-2 px-5 py-3 text-sm ${flashMessage.type === "error"
              ? "border-b border-red-100 bg-red-50/80 text-red-700"
              : "border-b border-slate-100 bg-slate-50/80 text-slate-700"
              }`}
          >
            {flashMessage.text}
          </div>
        ) : null}
        {error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : (
          <>
            <DataDisplay
              data={filteredUnits}
              loading={loading}
              loadingMessage="Fetching units…"
              emptyMessage={
                hasFilters
                  ? "No units match your filters"
                  : "No units yet"
              }
              columns={[
                {
                  key: "unit_number",
                  label: "Unit",
                  render: (value, item) => (
                    <div className="font-semibold text-slate-900">
                      {value ?? `Unit #${item.id}`}
                    </div>
                  ),
                },
                {
                  key: "property",
                  label: "Property",
                  render: (_, item) => (
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {item.property?.name ?? "Unassigned"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "unit_type",
                  label: "Type",
                  render: (_, item) => (
                    <span className="font-medium text-slate-900">
                      {item.unit_type?.name ?? "Not set"}
                    </span>
                  ),
                },
                {
                  key: "is_occupied",
                  label: "Status",
                  render: (value) => (
                    <OccupancyBadge occupied={Boolean(value)} />
                  ),
                },
                {
                  key: "rent_amount",
                  label: "Rent",
                  render: (value, item) => formatCurrency(value, item?.currency, item?.currency_symbol),
                },
                {
                  key: "security_deposit",
                  label: "Deposit",
                  render: (value, item) => formatCurrency(
                    value, 
                    item?.security_deposit_currency || item?.currency,
                    item?.security_deposit_currency_symbol || item?.currency_symbol
                  ),
                },
                {
                  key: "assets_count",
                  label: "Assets",
                  render: (value, item) => {
                    const count = Number(value ?? 0);
                    return (
                      <span className="text-sm text-slate-700">
                        {count > 0 ? `${count} asset${count === 1 ? "" : "s"}` : "None"}
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const unitId = item?.id;
                        const assetsCount = Number(
                          item?.assets_count ?? (Array.isArray(item?.assets) ? item.assets.length : 0),
                        );
                        const hasAssets = assetsCount > 0;
                        if (!unitId) return null;
                        return (
                          <Link
                            href={
                              hasAssets
                                ? `/assets?unitId=${unitId}`
                                : `/assets?createAsset=1&unitId=${unitId}`
                            }
                            className="text-sm font-semibold text-slate-600 transition hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                            title={hasAssets ? "Manage assets for this unit" : "Add an asset to this unit"}
                          >
                            {hasAssets ? "Manage assets" : "Add asset"}
                          </Link>
                        );
                      })()}
                      <Link
                        href={`/units/${item.id}`}
                        className="text-sm font-semibold text-primary transition hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                      <Link
                        href={`/units/${item.id}/edit`}
                        className="text-sm font-semibold text-slate-600 transition hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ),
                },
              ]}
              renderCard={(unit) => (
                <UnitCard
                  unit={unit}
                  onDelete={() => handleDelete(unit.id)}
                  deleting={deletingId === unit.id}
                />
              )}
              onRowClick={(unit) => {
                if (unit.id) {
                  window.location.href = `/units/${unit.id}`;
                }
              }}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>
                Showing {filteredUnits.length} of {units.length} loaded units
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

function RentSummaryCard({ totalRentMVR, totalRentUSD, rentCountMVR, rentCountUSD, rentTracked }) {
  const hasRent = totalRentMVR > 0 || totalRentUSD > 0;
  
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">Total monthly rent</p>
        <span className="text-primary"><Wallet size={20} /></span>
      </div>
      {hasRent ? (
        <div className="mt-3 space-y-2">
          {totalRentMVR > 0 && (
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {formatCurrency(totalRentMVR, 'MVR')}
              </p>
              {rentCountMVR > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {rentCountMVR} {rentCountMVR === 1 ? 'unit' : 'units'} in MVR
                </p>
              )}
            </div>
          )}
          {totalRentUSD > 0 && (
            <div className={totalRentMVR > 0 ? "pt-2 border-t border-slate-200" : ""}>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(totalRentUSD, 'USD')}
              </p>
              {rentCountUSD > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {rentCountUSD} {rentCountUSD === 1 ? 'unit' : 'units'} in USD
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-2xl font-semibold text-slate-900">—</p>
      )}
      {!hasRent && (
        <p className="mt-1 text-xs text-slate-500">Add rent amounts to track total</p>
      )}
    </div>
  );
}

function UnitCard({ unit, onDelete, deleting }) {
  const router = useRouter();
  const unitId = unit?.id;
  const propertyId = unit?.property_id;
  const propertyLabel = unit?.property?.name ?? "Unassigned property";
  const unitType = unit?.unit_type?.name ?? "Not set";
  const rentAmount = formatCurrency(unit?.rent_amount, unit?.currency, unit?.currency_symbol);
  const depositAmount = formatCurrency(
    unit?.security_deposit, 
    unit?.security_deposit_currency || unit?.currency,
    unit?.security_deposit_currency_symbol || unit?.currency_symbol
  );
  const assetsCount = Number(
    unit?.assets_count ?? (Array.isArray(unit?.assets) ? unit.assets.length : 0),
  );
  const hasAssets = assetsCount > 0;
  const assetsLabel = hasAssets
    ? `${assetsCount} ${assetsCount === 1 ? "asset" : "assets"} tracked`
    : "No assets yet";

  const handleCardClick = useCallback(() => {
    if (!unitId) {
      return;
    }
    router.push(`/units/${unitId}`);
  }, [router, unitId]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick],
  );

  const isDeleting = Boolean(deleting);

  const handleDeleteClick = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      if (!onDelete || isDeleting) {
        return;
      }

      onDelete();
    },
    [onDelete, isDeleting],
  );

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-white cursor-pointer"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Unit
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {unit?.unit_number ?? `Unit #${unit?.id}`}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <Building2 size={14} />
            {propertyLabel}
          </p>
        </div>
        <OccupancyBadge occupied={Boolean(unit?.is_occupied)} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Type
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">{unitType}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Rent
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">{rentAmount}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Deposit
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {depositAmount}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Assets
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">{assetsLabel}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={unitId ? `/units/${unitId}` : "#"}
            onClick={(event) => event.stopPropagation()}
            className="text-sm font-semibold text-primary transition hover:text-primary/80 focus:outline-none focus:underline"
          >
            View unit →
          </Link>
          {unitId ? (
            <Link
              href={
                hasAssets
                  ? `/assets?unitId=${unitId}`
                  : `/assets?createAsset=1&unitId=${unitId}`
              }
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-semibold text-slate-500 transition hover:text-primary focus:outline-none focus:underline"
            >
              {hasAssets ? "Manage assets" : "Add asset"}
            </Link>
          ) : null}
          {hasAssets && unitId ? (
            <Link
              href={`/assets?unitId=${unitId}`}
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-semibold text-slate-500 transition hover:text-primary focus:outline-none focus:underline"
            >
              View assets
            </Link>
          ) : null}
          {propertyId ? (
            <Link
              href={`/properties/${propertyId}`}
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-semibold text-slate-500 transition hover:text-primary focus:outline-none focus:underline"
            >
              View property
            </Link>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              No property link
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>ID {unitId}</span>
          {onDelete ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={12} />
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function OccupancyBadge({ occupied }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${occupied
        ? "bg-success/10 text-success"
        : "bg-emerald-100 text-emerald-600"
        }`}
    >
      {occupied ? "Occupied" : "Vacant"}
    </span>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">Fetching units…</p>
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
          We couldn&apos;t load your units
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

function EmptyState({ hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Layers size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No units match your filters" : "No units yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Add your first unit to start tracking leases, rent, and maintenance."}
        </p>
      </div>
      <Link
        href="/units/new"
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Plus size={16} />
        Add a unit
      </Link>
    </div>
  );
}

function formatCurrency(value, currency = null, symbol = null) {
  return formatCurrencyUtil(value, currency, symbol);
}



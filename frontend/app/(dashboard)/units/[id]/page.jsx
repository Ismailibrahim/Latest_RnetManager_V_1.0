"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  DoorClosed,
  DoorOpen,
  Hash,
  Layers,
  Loader2,
  Package,
  MapPin,
  Pencil,
  Wallet,
  Wrench,
  Calendar,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency-formatter";

export default function UnitDetailsPage({ params }) {
  const routeParams = React.use(params);
  const unitId = routeParams?.id;
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState(null);

  useEffect(() => {
    if (!unitId) {
      return;
    }

    const controller = new AbortController();

    async function fetchUnit() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load the unit details.");
        }

        const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          throw new Error("We couldn't find that unit.");
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          let message = payload?.message ?? `Unable to load unit (HTTP ${response.status}).`;
          
          // Add more context for common errors
          if (response.status === 403) {
            message = "You don't have permission to view this unit.";
          } else if (response.status === 404) {
            message = "Unit not found. It may have been deleted or you don't have access to it.";
          }
          
          throw new Error(message);
        }

        const payload = await response.json();
        // Handle both wrapped and unwrapped responses
        const unitData = payload?.data ?? payload;
        setUnit(unitData);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();

    return () => controller.abort();
  }, [unitId, refreshKey]);

  useEffect(() => {
    if (!unitId) {
      return;
    }

    const controller = new AbortController();

    async function fetchAssets() {
      setAssetsLoading(true);
      setAssetsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load assets for this unit.");
        }

        const url = new URL(`${API_BASE_URL}/assets`);
        url.searchParams.set("unit_id", unitId);
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
            `Unable to load assets for this unit (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setAssets(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setAssetsError(err.message);
      } finally {
        setAssetsLoading(false);
      }
    }

    fetchAssets();

    return () => controller.abort();
  }, [unitId, refreshKey]);

  useEffect(() => {
    if (!unitId) {
      return;
    }

    const controller = new AbortController();

    async function fetchMaintenanceRequests() {
      setMaintenanceLoading(true);
      setMaintenanceError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load maintenance history for this unit.");
        }

        const url = new URL(`${API_BASE_URL}/maintenance-requests`);
        url.searchParams.set("unit_id", unitId);
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
            `Unable to load maintenance history for this unit (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setMaintenanceRequests(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setMaintenanceError(err.message);
      } finally {
        setMaintenanceLoading(false);
      }
    }

    fetchMaintenanceRequests();

    return () => controller.abort();
  }, [unitId, refreshKey]);

  const occupancy = unit?.is_occupied ? "Occupied" : "Vacant";
  const propertyId = unit?.property?.id;
  const propertyLabel = unit?.property?.name ?? "Unassigned property";
  const rentAmount = formatCurrency(
    unit?.rent_amount,
    unit?.currency,
    unit?.currency_symbol
  );
  const depositAmount = formatCurrency(
    unit?.security_deposit,
    unit?.security_deposit_currency || unit?.currency,
    unit?.security_deposit_currency_symbol || unit?.currency_symbol
  );
  const unitTypeLabel = unit?.unit_type?.name ?? "Not set";

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/units"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back to units</span>
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Unit detail
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Layers size={22} className="text-primary" />
              {unit?.unit_number ?? `Unit #${unit?.id ?? unitId}`}
            </h1>
            <p className="text-sm text-slate-500">
              {propertyLabel}
              {propertyId ? (
                <>
                  {" · "}
                  <Link
                    href={`/properties/${propertyId}`}
                    className="font-semibold text-primary transition hover:text-primary/80"
                  >
                    View property
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {unitId ? (
          <Link
            href={`/units/${unitId}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary"
          >
            <Pencil size={16} />
            Edit unit
          </Link>
        ) : null}
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : unit ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Overview
                </h2>
                <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <InfoRow
                    icon={MapPin}
                    title="Property"
                    value={propertyLabel}
                    helper={
                      propertyId ? (
                        <Link
                          href={`/properties/${propertyId}`}
                          className="text-xs font-semibold text-primary transition hover:text-primary/80"
                        >
                          View property details →
                        </Link>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    icon={Hash}
                    title="Unit number"
                    value={unit?.unit_number ?? `#${unit.id}`}
                  />
                  <InfoRow
                    icon={Building2}
                    title="Unit type"
                    value={unitTypeLabel}
                  />
                  <InfoRow
                    icon={unit?.is_occupied ? DoorOpen : DoorClosed}
                    title="Occupancy"
                    value={<OccupancyBadge occupied={unit?.is_occupied} />}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Financial snapshot
                </h2>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <InfoRow
                    icon={Wallet}
                    title="Rent amount"
                    value={rentAmount}
                  />
                  <InfoRow
                    icon={Building2}
                    title="Security deposit"
                    value={depositAmount}
                  />
                </div>
              </div>

              <AssetsCard
                unitId={unitId}
                assets={assets}
                loading={assetsLoading}
                error={assetsError}
                onRetry={handleRetry}
              />
            </div>

            <MaintenanceHistoryCard
              unitId={unitId}
              maintenanceRequests={maintenanceRequests}
              loading={maintenanceLoading}
              error={maintenanceError}
              onRetry={handleRetry}
            />

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-xs text-slate-500">
              <p>
                Unit ID: <span className="font-semibold text-slate-700">{unit.id}</span>
              </p>
              <p className="mt-1">
                Updated at{" "}
                <span className="font-semibold text-slate-700">
                  {unit.updated_at
                    ? new Date(unit.updated_at).toLocaleString()
                    : "N/A"}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <ErrorState message="Unit data is missing." onRetry={handleRetry} />
        )}
      </section>
    </div>
  );
}

function AssetsCard({ unitId, assets, loading, error, onRetry }) {
  const visibleAssets = Array.isArray(assets) ? assets.slice(0, 4) : [];
  const remainingCount = Math.max((assets?.length ?? 0) - visibleAssets.length, 0);
  const assetCountLabel =
    assets?.length === 1
      ? "Tracking 1 asset in this unit."
      : `Tracking ${assets?.length ?? 0} assets in this unit.`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Package size={16} className="text-primary" />
            Assets
          </h2>
          {!loading && !error ? (
            <p className="text-xs text-slate-500">{assetCountLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/assets?createAsset=1&unitId=${unitId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            Add asset
          </Link>
          <Link
            href={`/assets?unitId=${unitId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            Manage assets
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p>Fetching assets assigned to this unit…</p>
        </div>
      ) : error ? (
        <div className="mt-6 space-y-3 rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-600">
          <p className="font-semibold">We ran into a problem.</p>
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      ) : visibleAssets.length > 0 ? (
        <>
          <ul className="mt-4 space-y-3">
            {visibleAssets.map((asset) => {
              const assetLabel =
                asset?.name ?? asset?.asset_type?.name ?? `Asset #${asset?.id ?? "?"}`;
              const assetMetaParts = [
                asset?.asset_type?.name,
                [asset?.brand, asset?.model].filter(Boolean).join(" "),
                formatOwnership(asset?.ownership),
              ].filter(Boolean);

              return (
                <li
                  key={asset?.id ?? assetLabel}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{assetLabel}</p>
                      {assetMetaParts.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {assetMetaParts.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <span className={getStatusBadgeClass(asset?.status)}>
                      {formatAssetStatus(asset?.status)}
                    </span>
                  </div>
                  {asset?.location ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Location: <span className="font-medium">{asset.location}</span>
                    </p>
                  ) : null}
                  {asset?.installation_date ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Installed on{" "}
                      <span className="font-medium">
                        {new Date(asset.installation_date).toLocaleDateString()}
                      </span>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {remainingCount > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              And {remainingCount} more {remainingCount === 1 ? "asset" : "assets"} in this
              unit. Visit the assets workspace for the full list.
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-700">No assets tracked yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Add an asset to document appliances, fixtures, or furnishings installed in this
            unit.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, title, value, helper }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-1 h-5 w-5 text-primary" />
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <div className="text-sm text-slate-600">
          {typeof value === "string" || typeof value === "number" ? (
            <p>{value}</p>
          ) : (
            value
          )}
        </div>
        {helper ? <div className="mt-1">{helper}</div> : null}
      </div>
    </div>
  );
}

function OccupancyBadge({ occupied }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        occupied ? "bg-success/10 text-success" : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {occupied ? (
        <>
          <DoorOpen size={12} />
          Occupied
        </>
      ) : (
        <>
          <DoorClosed size={12} />
          Vacant
        </>
      )}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching unit details…
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load that unit
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
        Try again
      </button>
    </div>
  );
}

function formatCurrency(value, currency = null, symbol = null) {
  return formatCurrencyUtil(value, currency, symbol);
}

function formatAssetStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status
    .toString()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatOwnership(ownership) {
  if (!ownership) {
    return null;
  }

  if (ownership === "tenant") {
    return "Tenant owned";
  }

  if (ownership === "landlord") {
    return "Landlord owned";
  }

  return ownership.toString().replace(/[_-]/g, " ");
}

function getStatusBadgeClass(status) {
  const baseClasses =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide";

  switch (status) {
    case "working":
      return `${baseClasses} bg-success/10 text-success`;
    case "maintenance":
      return `${baseClasses} bg-amber-100 text-amber-700`;
    case "broken":
      return `${baseClasses} bg-red-100 text-red-600`;
    default:
      return `${baseClasses} bg-slate-200 text-slate-700`;
  }
}

function MaintenanceHistoryCard({ unitId, maintenanceRequests, loading, error, onRetry }) {
  const visibleRequests = Array.isArray(maintenanceRequests) ? maintenanceRequests.slice(0, 5) : [];
  const remainingCount = Math.max((maintenanceRequests?.length ?? 0) - visibleRequests.length, 0);
  const requestCountLabel =
    maintenanceRequests?.length === 1
      ? "1 maintenance record for this unit."
      : `${maintenanceRequests?.length ?? 0} maintenance records for this unit.`;

  const formatMaintenanceDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMaintenanceType = (type) => {
    if (!type) return "Unknown";
    return type
      .toString()
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getTypeBadgeClass = (type) => {
    const baseClasses =
      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide";
    
    switch (type) {
      case "repair":
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case "replacement":
        return `${baseClasses} bg-purple-100 text-purple-700`;
      case "service":
        return `${baseClasses} bg-green-100 text-green-700`;
      default:
        return `${baseClasses} bg-slate-200 text-slate-700`;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Wrench size={16} className="text-primary" />
            Maintenance History
          </h2>
          {!loading && !error ? (
            <p className="text-xs text-slate-500">{requestCountLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/maintenance?unit_id=${unitId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            View all
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p>Fetching maintenance history for this unit…</p>
        </div>
      ) : error ? (
        <div className="mt-6 space-y-3 rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-600">
          <p className="font-semibold">We ran into a problem.</p>
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      ) : visibleRequests.length > 0 ? (
        <>
          <ul className="mt-4 space-y-3">
            {visibleRequests.map((request) => {
              const cost = formatCurrency(
                request?.cost ?? 0,
                null,
                null
              );

              return (
                <li
                  key={request?.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {request?.description ?? "No description"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {request?.maintenance_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatMaintenanceDate(request.maintenance_date)}
                          </span>
                        )}
                        {request?.type && (
                          <span className={getTypeBadgeClass(request.type)}>
                            {formatMaintenanceType(request.type)}
                          </span>
                        )}
                        {request?.serviced_by && (
                          <span>Serviced by: {request.serviced_by}</span>
                        )}
                      </div>
                      {request?.location && (
                        <p className="mt-2 text-xs text-slate-500">
                          Location: <span className="font-medium">{request.location}</span>
                        </p>
                      )}
                      {request?.asset?.name && (
                        <p className="mt-1 text-xs text-slate-500">
                          Asset: <span className="font-medium">{request.asset.name}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {cost}
                      </span>
                      {request?.is_billable && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          Billable
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {remainingCount > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              And {remainingCount} more {remainingCount === 1 ? "record" : "records"} in this
              unit. Visit the maintenance workspace for the full history.
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-700">No maintenance history yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Maintenance records will appear here once they are created for this unit.
          </p>
        </div>
      )}
    </div>
  );
}



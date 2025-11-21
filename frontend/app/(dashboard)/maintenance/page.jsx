"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Mail,
  Phone,
  ShieldCheck,
  Wrench,
  Plus,
  Edit,
  Trash2,
  X,
  RefreshCcw,
  Search,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

// Vendors are now loaded from API (directory) instead of hardcoded

const fieldCapacity = [
  {
    team: "Male City crew",
    coverage: "Core urban properties",
    load: "4 / 6 active slots",
  },
  {
    team: "South atoll crew",
    coverage: "Addu & Fuvahmulah rotations",
    load: "3 / 5 active slots",
  },
  {
    team: "Vendor scheduled",
    coverage: "Speciality contractors",
    load: "7 confirmed today",
  },
];

export default function MaintenancePage() {
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [units, setUnits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorTotalPages, setVendorTotalPages] = useState(1);

  // Filters
  const [unitFilter, setUnitFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(undefined);
  const [dateTo, setDateTo] = useState(undefined);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchMaintenanceRequests() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load maintenance requests.",
          );
        }

        const url = new URL(`${API_BASE_URL}/maintenance-requests`);
        url.searchParams.set("per_page", "100");

        if (unitFilter !== "all") {
          url.searchParams.set("unit_id", unitFilter);
        }

        if (typeFilter !== "all") {
          url.searchParams.set("type", typeFilter);
        }

        if (billableFilter !== "all") {
          url.searchParams.set(
            "is_billable",
            billableFilter === "true" ? "true" : "false",
          );
        }

        if (dateFrom && dateFrom.trim()) {
          url.searchParams.set("maintenance_date_from", dateFrom);
        }
        if (dateTo && dateTo.trim()) {
          url.searchParams.set("maintenance_date_to", dateTo);
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
            `Unable to load maintenance requests (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setMaintenanceRequests(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMaintenanceRequests();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey, unitFilter, typeFilter, billableFilter, dateFrom, dateTo]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnits() {
      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          return;
        }

        if (!API_BASE_URL) {
          if (process.env.NODE_ENV === "development") {
            console.warn("API_BASE_URL is not configured");
          }
          return;
        }

        const url = new URL(`${API_BASE_URL}/units`);
        url.searchParams.set("per_page", "1000");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Silently fail - units are optional for the maintenance page
          return;
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setUnits(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        // Silently fail - units are optional for the maintenance page
        // Network errors (like "Failed to fetch") are expected if the API is down
        if (isMounted) {
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch units:", err);
          }
        }
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Load vendors directory (for the side card)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchVendors() {
      try {
        setLoadingVendors(true);
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const url = new URL(`${API_BASE_URL}/vendors`);
        url.searchParams.set("per_page", "10");
        url.searchParams.set("page", String(vendorPage));
        // Optionally show preferred first in future; for now, fetch all

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Silently ignore; this card is optional
          return;
        }

        const payload = await response.json();
        if (!isMounted) return;
        const data = Array.isArray(payload?.data) ? payload.data : payload ?? [];
        // Laravel paginator returns meta with last_page/current_page
        const meta = payload?.meta;
        if (meta) {
          setVendorTotalPages(Number(meta.last_page ?? 1));
        } else {
          // Fallback if no meta: single page
          setVendorTotalPages(1);
        }
        setVendors(data);
      } catch {
        // optional card - ignore errors
      } finally {
        if (isMounted) setLoadingVendors(false);
      }
    }

    fetchVendors();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [vendorPage]);

  const fetchAssetsForUnit = useCallback(async (unitId) => {
    // Reset assets if no unit selected
    if (!unitId || unitId === "" || unitId === "0") {
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    setLoadingAssets(true);
    try {
      const url = new URL(`${API_BASE_URL}/assets`);
      url.searchParams.set("unit_id", String(unitId));
      url.searchParams.set("per_page", "1000");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If 404 or other error, just set empty array
        setAssets([]);
        return;
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setAssets(data);
    } catch (err) {
      // Silently fail - assets are optional
      console.error("Failed to fetch assets:", err);
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (flashMessage) {
      const timeout = setTimeout(() => {
        setFlashMessage(null);
      }, 3200);

      return () => clearTimeout(timeout);
    }
  }, [flashMessage]);

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleCreate = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    if (request.unit_id) {
      fetchAssetsForUnit(request.unit_id);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this maintenance request?")) {
      return;
    }

    setDeletingId(id);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("No API token found.");
      }

      const response = await fetch(`${API_BASE_URL}/maintenance-requests/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete maintenance request (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setMaintenanceRequests((previous) =>
        previous.filter((item) => item.id !== id),
      );
      setFlashMessage({ type: "success", text: "Maintenance request deleted." });
    } catch (err) {
      setFlashMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setUnitFilter("all");
    setTypeFilter("all");
    setBillableFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters =
    unitFilter !== "all" ||
    typeFilter !== "all" ||
    billableFilter !== "all" ||
    (dateFrom && dateFrom.trim()) ||
    (dateTo && dateTo.trim());

  const unitOptions = useMemo(() => {
    const options = units.map((unit) => ({
      value: String(unit.id),
      label: `${unit.unit_number ?? `Unit #${unit.id}`} - ${
        unit.property?.name ?? "Unknown Property"
      }`,
    }));
    return [{ value: "all", label: "All units" }, ...options];
  }, [units]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Live maintenance command
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wrench size={24} className="text-primary" />
            Maintenance
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monitor ticket intake, dispatch workload, and SLA compliance across
            properties. Insights refresh when the API syncs with the operations
            backend.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Create Request
          </button>
        </div>
      </header>

      {flashMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            flashMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {flashMessage.text}
        </div>
      ) : null}

      {/* Summary cards removed as not needed */}

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All types</option>
            <option value="repair">Repair</option>
            <option value="replacement">Replacement</option>
            <option value="service">Service</option>
          </select>

          <select
            value={billableFilter}
            onChange={(e) => setBillableFilter(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All billable</option>
            <option value="true">Billable</option>
            <option value="false">Not billable</option>
          </select>

          <input
            type="date"
            value={dateFrom || ""}
            onChange={(e) => setDateFrom(e.target.value || undefined)}
            placeholder="From date"
            suppressHydrationWarning
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <input
            type="date"
            value={dateTo || ""}
            onChange={(e) => setDateTo(e.target.value || undefined)}
            placeholder="To date"
            suppressHydrationWarning
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCcw size={16} />
              Reset
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Active maintenance queue
              </h2>
              <p className="text-xs text-slate-500">
                Prioritised by urgency and SLA window · synced every 5 minutes
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {maintenanceRequests.length} requests
            </span>
          </header>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Error loading maintenance requests</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <DataDisplay
              data={maintenanceRequests}
              loading={loading}
              loadingMessage="Fetching maintenance requests…"
              emptyMessage={
                hasFilters
                  ? "No maintenance requests match your filters"
                  : "No maintenance requests yet"
              }
              columns={[
                {
                  key: "id",
                  label: "ID",
                  render: (value) => (
                    <span className="font-semibold text-slate-900">
                      #{value}
                    </span>
                  ),
                },
                {
                  key: "unit",
                  label: "Property / Unit",
                  render: (_, item) => (
                    <div>
                      <div className="font-medium text-slate-900">
                        {item.unit?.property?.name ?? "Unknown Property"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Unit {item.unit?.unit_number ?? `#${item.unit_id}`}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "description",
                  label: "Description",
                  render: (value) => (
                    <span className="text-sm text-slate-600">{value}</span>
                  ),
                },
                {
                  key: "type",
                  label: "Type",
                  render: (value) => (
                    <TypeBadge type={value ?? "repair"} />
                  ),
                },
                {
                  key: "cost",
                  label: "Cost",
                  render: (value) => (
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(value ?? 0)}
                    </span>
                  ),
                },
                {
                  key: "maintenance_date",
                  label: "Date",
                  render: (value) => (
                    <span className="text-sm text-slate-600">
                      {value ? formatDate(value) : "—"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ),
                },
              ]}
              renderCard={(request) => (
                <MaintenanceRequestCard
                  request={request}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              )}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-9 w-9 rounded-full bg-primary/10 p-2 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Backlog spotlight
                </h3>
                <p className="text-xs text-slate-500">
                  Total maintenance requests by type.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {(() => {
                const totals = maintenanceRequests.reduce(
                  (acc, item) => {
                    const key = (item?.type ?? "repair").toLowerCase();
                    if (key === "replacement") acc.replacement += 1;
                    else if (key === "service") acc.service += 1;
                    else acc.repair += 1;
                    return acc;
                  },
                  { repair: 0, replacement: 0, service: 0 },
                );

                const metrics = [
                  {
                    title: "Repair",
                    value: String(totals.repair),
                    description: "All repair tickets across properties",
                    tone: "warning",
                  },
                  {
                    title: "Replacement",
                    value: String(totals.replacement),
                    description: "All replacement requests",
                    tone: "muted",
                  },
                  {
                    title: "Service",
                    value: String(totals.service),
                    description: "Scheduled or routine services",
                    tone: "danger",
                  },
                ];

                return metrics.map((metric) => (
                <li
                  key={metric.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      {metric.title}
                    </p>
                    <span className={badgeTone(metric.tone)}>{metric.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {metric.description}
                  </p>
                </li>
                ));
              })()}
            </ul>
          </div>

          {/* Field crew capacity section removed as not needed */}
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-9 w-9 rounded-full bg-violet-100 p-2 text-violet-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Vendor control centre
              </h2>
              <p className="text-xs text-slate-500">
                Fast access to preferred contractors island-wide.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {loadingVendors ? (
              <li className="text-xs text-slate-500">Loading vendors…</li>
            ) : vendors.length === 0 ? (
              <li className="text-xs text-slate-500">No vendors available yet.</li>
            ) : (
              vendors.map((vendor) => (
                <li
                  key={vendor.id ?? vendor.name}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600"
                >
                  <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                  <p className="text-xs text-slate-500">
                    {vendor.service_category ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {vendor.phone ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Phone size={14} className="text-slate-400" />
                        {vendor.phone}
                      </span>
                    ) : null}
                    {vendor.email ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Mail size={14} className="text-slate-400" />
                        {vendor.email}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Pagination controls */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={vendorPage <= 1 || loadingVendors}
              onClick={() => setVendorPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {vendorPage} of {vendorTotalPages}
            </span>
            <button
              type="button"
              disabled={vendorPage >= vendorTotalPages || loadingVendors}
              onClick={() =>
                setVendorPage((p) => (p < vendorTotalPages ? p + 1 : p))
              }
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Island distribution section removed as not needed */}

      {isModalOpen && (
        <MaintenanceRequestModal
          request={editingRequest}
          units={units}
          assets={assets}
          loadingAssets={loadingAssets}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRequest(null);
            setAssets([]);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingRequest(null);
            setAssets([]);
            setRefreshKey((value) => value + 1);
            setFlashMessage({
              type: "success",
              text: editingRequest
                ? "Maintenance request updated."
                : "Maintenance request created.",
            });
          }}
          onFetchAssets={fetchAssetsForUnit}
        />
      )}
    </div>
  );
}

function MaintenanceRequestModal({
  request,
  units,
  assets,
  loadingAssets,
  onClose,
  onSuccess,
  onFetchAssets,
}) {
  const [formData, setFormData] = useState({
    unit_id: request?.unit_id ?? "",
    description: request?.description ?? "",
    cost: request?.cost ?? "",
    asset_id: request?.asset_id ?? "",
    location: request?.location ?? "",
    serviced_by: request?.serviced_by ?? "",
    invoice_number: request?.invoice_number ?? "",
    type: request?.type ?? "repair",
    maintenance_date: request?.maintenance_date ?? "",
    is_billable: request?.is_billable ?? true,
    billed_to_tenant: request?.billed_to_tenant ?? false,
    tenant_share: request?.tenant_share ?? "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch assets when modal opens with an existing request
    if (request?.unit_id && assets.length === 0) {
      onFetchAssets(request.unit_id);
    }
  }, [request?.unit_id, assets.length, onFetchAssets]);

  useEffect(() => {
    // Fetch assets when unit_id changes in the form
    const unitId = formData.unit_id;
    if (unitId && unitId !== "" && unitId !== "0") {
      // Only fetch if unit changed from the original request
      if (!request || String(unitId) !== String(request.unit_id || "")) {
        onFetchAssets(unitId);
      }
    }
  }, [formData.unit_id, request?.unit_id, onFetchAssets, request]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("No API token found.");
      }

      const payload = {
        unit_id: Number(formData.unit_id),
        description: formData.description,
        cost: Number(formData.cost),
        maintenance_date: formData.maintenance_date,
        type: formData.type,
        is_billable: formData.is_billable,
        billed_to_tenant: formData.billed_to_tenant,
      };

      if (formData.asset_id) {
        payload.asset_id = Number(formData.asset_id);
      }

      if (formData.location) {
        payload.location = formData.location;
      }

      if (formData.serviced_by) {
        payload.serviced_by = formData.serviced_by;
      }

      if (formData.invoice_number) {
        payload.invoice_number = formData.invoice_number;
      }

      if (formData.billed_to_tenant && formData.tenant_share) {
        payload.tenant_share = Number(formData.tenant_share);
      }

      const url = request
        ? `${API_BASE_URL}/maintenance-requests/${request.id}`
        : `${API_BASE_URL}/maintenance-requests`;

      const response = await fetch(url, {
        method: request ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to ${request ? "update" : "create"} maintenance request (HTTP ${response.status}).`;
        throw new Error(message);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {request ? "Edit Maintenance Request" : "Create Maintenance Request"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.unit_id}
                onChange={(e) =>
                  setFormData({ ...formData, unit_id: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number ?? `Unit #${unit.id}`} -{" "}
                    {unit.property?.name ?? "Unknown Property"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cost (MVR) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Maintenance Date <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={formData.maintenance_date}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_date: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="repair">Repair</option>
                  <option value="replacement">Replacement</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Asset
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) =>
                    setFormData({ ...formData, asset_id: e.target.value })
                  }
                  disabled={!formData.unit_id || loadingAssets}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">No asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Serviced By
                </label>
                <input
                  type="text"
                  value={formData.serviced_by}
                  onChange={(e) =>
                    setFormData({ ...formData, serviced_by: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Billing Options
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_billable}
                      onChange={(e) =>
                        setFormData({ ...formData, is_billable: e.target.checked })
                      }
                      className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">
                        Is Billable
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Mark this maintenance as a billable expense. Uncheck if this is a non-billable maintenance (e.g., routine inspection).
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.billed_to_tenant}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billed_to_tenant: e.target.checked,
                        })
                      }
                      disabled={!formData.is_billable}
                      className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">
                        Billed to Tenant
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Check this if the tenant should be charged for this maintenance. Requires "Is Billable" to be checked. You can create a Maintenance Invoice separately to bill the tenant.
                      </p>
                    </div>
                  </label>
                </div>

                {formData.billed_to_tenant && (
                  <div className="ml-7">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Tenant Share (MVR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required={formData.billed_to_tenant}
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tenant_share}
                      onChange={(e) =>
                        setFormData({ ...formData, tenant_share: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Amount the tenant should pay. This can be the full cost or a partial amount.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 p-2">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> To create a formal invoice for the tenant, go to{" "}
                  <strong>Maintenance Invoices</strong> and create an invoice there. You can optionally link it to this maintenance request.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : request
                  ? "Update Request"
                  : "Create Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const config = {
    repair: {
      label: "Repair",
      className: "bg-blue-100 text-blue-600",
    },
    replacement: {
      label: "Replacement",
      className: "bg-purple-100 text-purple-600",
    },
    service: {
      label: "Service",
      className: "bg-green-100 text-green-600",
    },
  };

  const tone = config[type] ?? config.repair;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      {tone.label}
    </span>
  );
}

function summaryTone(tone) {
  const mapping = {
    default: "border border-slate-200 bg-white/80 shadow-sm backdrop-blur",
    success: "border border-emerald-100 bg-emerald-50/90 shadow-sm backdrop-blur",
    warning: "border border-amber-100 bg-amber-50/90 shadow-sm backdrop-blur",
    danger: "border border-red-100 bg-red-50/90 shadow-sm backdrop-blur",
    info: "border border-sky-100 bg-sky-50/90 shadow-sm backdrop-blur",
  };

  return mapping[tone] ?? mapping.default;
}

function badgeTone(tone) {
  const mapping = {
    warning: "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700",
    danger: "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600",
    muted: "rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700",
  };

  return mapping[tone] ?? mapping.muted;
}

function MaintenanceRequestCard({ request, onEdit, onDelete, deletingId }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Request #{request.id}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {request.description}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {request.unit?.property?.name ?? "Unknown Property"} - Unit{" "}
            {request.unit?.unit_number ?? `#${request.unit_id}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <TypeBadge type={request.type ?? "repair"} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(request)}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
              title="Edit"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(request.id)}
              disabled={deletingId === request.id}
              className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Cost</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {formatCurrency(request.cost ?? 0)}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Date</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {request.maintenance_date
                ? formatDate(request.maintenance_date)
                : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Billable</dt>
            <dd className="mt-1 font-semibold text-slate-800">
              {request.is_billable ? "Yes" : "No"}
            </dd>
          </div>
        </div>
        {request.serviced_by && (
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Serviced By
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {request.serviced_by}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  // Force "MVR" prefix instead of locale symbol (Rf)
  const formatted = amount.toLocaleString("en-MV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `MVR ${formatted}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

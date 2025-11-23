"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Wrench,
  Plus,
  Edit,
  Trash2,
  X,
  RefreshCcw,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

export default function MaintenancePage() {
  const router = useRouter();
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [maintenanceInvoices, setMaintenanceInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Filters
  const [unitFilter, setUnitFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(undefined);
  const [dateTo, setDateTo] = useState(undefined);

  // Summary date range filter
  const [summaryDateRange, setSummaryDateRange] = useState("month"); // "month", "year", "custom"
  const [summaryDateFrom, setSummaryDateFrom] = useState(undefined);
  const [summaryDateTo, setSummaryDateTo] = useState(undefined);

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
        url.searchParams.set("per_page", "1000");

        if (unitFilter !== "all") {
          url.searchParams.set("unit_id", unitFilter);
        }

        if (propertyFilter !== "all") {
          // Filter by property - we'll filter client-side since API might not support property filter directly
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
  }, [refreshKey, unitFilter, propertyFilter, typeFilter, billableFilter, dateFrom, dateTo]);

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
        }).catch((fetchError) => {
          // Suppress network errors for optional data
          // Return null to indicate fetch failed, but don't throw
          return null;
        });

        if (!response || !response.ok) {
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
        // All errors are suppressed since this is optional data
        // The page will work fine without units data
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Load maintenance invoices to check invoice status
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchInvoices() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const url = new URL(`${API_BASE_URL}/maintenance-invoices`);
        url.searchParams.set("per_page", "1000");

        const response = await fetch(url.toString(), {
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
        if (!isMounted) return;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setMaintenanceInvoices(data);
      } catch {
        // Silently ignore errors
      }
    }

    fetchInvoices();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  // Load properties for filtering
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchProperties() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const url = new URL(`${API_BASE_URL}/properties`);
        url.searchParams.set("per_page", "1000");

        const response = await fetch(url.toString(), {
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
        if (!isMounted) return;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setProperties(data);
      } catch {
        // Silently ignore errors
      }
    }

    fetchProperties();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

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
    if (!confirm("Are you sure you want to delete this maintenance expense?")) {
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
      setFlashMessage({ type: "success", text: "Maintenance expense deleted." });
    } catch (err) {
      setFlashMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setUnitFilter("all");
    setPropertyFilter("all");
    setTypeFilter("all");
    setBillableFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters =
    unitFilter !== "all" ||
    propertyFilter !== "all" ||
    typeFilter !== "all" ||
    billableFilter !== "all" ||
    (dateFrom && dateFrom.trim()) ||
    (dateTo && dateTo.trim());

  // Filter maintenance requests by property (client-side)
  const filteredMaintenanceRequests = useMemo(() => {
    let filtered = maintenanceRequests;

    if (propertyFilter !== "all") {
      filtered = filtered.filter(
        (req) => req.unit?.property_id === Number(propertyFilter)
      );
    }

    return filtered;
  }, [maintenanceRequests, propertyFilter]);

  // Check if expense is invoiced
  const isExpenseInvoiced = useCallback(
    (requestId) => {
      return maintenanceInvoices.some(
        (invoice) => invoice.maintenance_request_id === requestId
      );
    },
    [maintenanceInvoices]
  );

  // Handle create invoice
  const handleCreateInvoice = (request) => {
    // Navigate to maintenance invoices page with pre-filled data
    router.push(
      `/maintenance-invoices?maintenance_request_id=${request.id}&unit_id=${request.unit_id}`
    );
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    let filtered = filteredMaintenanceRequests;

    // Apply date range filter for summary
    const now = new Date();
    let summaryFrom, summaryTo;

    if (summaryDateRange === "month") {
      summaryFrom = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      summaryTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
    } else if (summaryDateRange === "year") {
      summaryFrom = new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      summaryTo = new Date(now.getFullYear(), 11, 31)
        .toISOString()
        .split("T")[0];
    } else if (summaryDateRange === "custom") {
      summaryFrom = summaryDateFrom;
      summaryTo = summaryDateTo;
    }

    if (summaryFrom) {
      filtered = filtered.filter(
        (req) => req.maintenance_date >= summaryFrom
      );
    }
    if (summaryTo) {
      filtered = filtered.filter((req) => req.maintenance_date <= summaryTo);
    }

    const stats = {
      total: 0,
      totalAmount: 0,
      byType: { repair: 0, replacement: 0, service: 0 },
      byTypeAmount: { repair: 0, replacement: 0, service: 0 },
      billable: { count: 0, amount: 0 },
      nonBillable: { count: 0, amount: 0 },
      byProperty: {},
    };

    filtered.forEach((req) => {
      const cost = Number(req.cost ?? 0);
      const type = (req.type ?? "repair").toLowerCase();
      const propertyId = req.unit?.property_id;
      const propertyName = req.unit?.property?.name ?? "Unknown Property";

      stats.total += 1;
      stats.totalAmount += cost;

      if (type === "repair") {
        stats.byType.repair += 1;
        stats.byTypeAmount.repair += cost;
      } else if (type === "replacement") {
        stats.byType.replacement += 1;
        stats.byTypeAmount.replacement += cost;
      } else if (type === "service") {
        stats.byType.service += 1;
        stats.byTypeAmount.service += cost;
      }

      if (req.is_billable) {
        stats.billable.count += 1;
        stats.billable.amount += cost;
      } else {
        stats.nonBillable.count += 1;
        stats.nonBillable.amount += cost;
      }

      if (propertyId) {
        if (!stats.byProperty[propertyId]) {
          stats.byProperty[propertyId] = {
            name: propertyName,
            count: 0,
            amount: 0,
          };
        }
        stats.byProperty[propertyId].count += 1;
        stats.byProperty[propertyId].amount += cost;
      }
    });

    return stats;
  }, [
    filteredMaintenanceRequests,
    summaryDateRange,
    summaryDateFrom,
    summaryDateTo,
  ]);

  const unitOptions = useMemo(() => {
    const options = units.map((unit) => ({
      value: String(unit.id),
      label: `${unit.unit_number ?? `Unit #${unit.id}`} - ${
        unit.property?.name ?? "Unknown Property"
      }`,
    }));
    return [{ value: "all", label: "All units" }, ...options];
  }, [units]);

  const propertyOptions = useMemo(() => {
    const options = properties.map((property) => ({
      value: String(property.id),
      label: property.name ?? `Property #${property.id}`,
    }));
    return [{ value: "all", label: "All properties" }, ...options];
  }, [properties]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Expense Tracking
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <DollarSign size={24} className="text-primary" />
            Maintenance Expenses
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Record and track all maintenance expenses for accounting and reporting.
            Track billable expenses that can be invoiced to tenants, and non-billable
            expenses paid by the landlord.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Record Expense
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

      {/* Expense Summary Cards */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Expense Summary</h2>
          <div className="flex items-center gap-2">
            <select
              value={summaryDateRange}
              onChange={(e) => {
                setSummaryDateRange(e.target.value);
                if (e.target.value !== "custom") {
                  setSummaryDateFrom(undefined);
                  setSummaryDateTo(undefined);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {summaryDateRange === "custom" && (
              <>
                <input
                  type="date"
                  value={summaryDateFrom || ""}
                  onChange={(e) => setSummaryDateFrom(e.target.value || undefined)}
                  placeholder="From"
                  suppressHydrationWarning
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="date"
                  value={summaryDateTo || ""}
                  onChange={(e) => setSummaryDateTo(e.target.value || undefined)}
                  placeholder="To"
                  suppressHydrationWarning
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Expenses Card */}
          <div className="rounded-2xl border border-slate-200 bg-sky-50/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Expenses
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(summaryStats.totalAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {summaryStats.total} {summaryStats.total === 1 ? "expense" : "expenses"}
                </p>
              </div>
              <div className="rounded-full bg-white/70 p-3 text-primary shadow-sm">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* By Type Card */}
          <div className="rounded-2xl border border-slate-200 bg-sky-50/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                By Type
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Repair</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(summaryStats.byTypeAmount.repair)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Replacement</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(summaryStats.byTypeAmount.replacement)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Service</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(summaryStats.byTypeAmount.service)}
                </span>
              </div>
            </div>
          </div>

          {/* Billable vs Non-Billable Card */}
          <div className="rounded-2xl border border-slate-200 bg-emerald-50/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Billable Status
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Billable</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(summaryStats.billable.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Non-Billable</span>
                <span className="font-semibold text-slate-600">
                  {formatCurrency(summaryStats.nonBillable.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* By Property Card */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Top Properties
              </p>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.values(summaryStats.byProperty)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3)
                .map((prop, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-600" title={prop.name}>
                      {prop.name}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(prop.amount)}
                    </span>
                  </div>
                ))}
              {Object.keys(summaryStats.byProperty).length === 0 && (
                <p className="text-xs text-slate-400">No expenses yet</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {propertyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

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

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Maintenance Expenses
            </h2>
            <p className="text-xs text-slate-500">
              All recorded maintenance expenses for accounting and reporting
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {filteredMaintenanceRequests.length} {filteredMaintenanceRequests.length === 1 ? "expense" : "expenses"}
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
              data={filteredMaintenanceRequests}
              loading={loading}
              loadingMessage="Loading maintenance expenses…"
              emptyMessage={
                hasFilters
                  ? "No expenses match your filters"
                  : "No maintenance expenses recorded yet"
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
                      {item.unit?.is_occupied && item.unit?.current_tenant && (
                        <div className="mt-1 text-xs font-medium text-primary">
                          Tenant: {item.unit.current_tenant.full_name}
                        </div>
                      )}
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
                  key: "invoice_status",
                  label: "Invoice Status",
                  render: (_, item) => {
                    const invoiced = isExpenseInvoiced(item.id);
                    const isBillable = item.is_billable;
                    
                    if (!isBillable) {
                      return (
                        <span className="text-xs text-slate-400">N/A</span>
                      );
                    }
                    
                    return invoiced ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <FileText size={12} />
                        Invoiced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Not Invoiced
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => {
                    const invoiced = isExpenseInvoiced(item.id);
                    const canCreateInvoice = item.is_billable && !invoiced;
                    
                    return (
                      <div className="flex items-center gap-2">
                        {canCreateInvoice && (
                          <button
                            type="button"
                            onClick={() => handleCreateInvoice(item)}
                            className="rounded-lg border border-primary bg-primary/10 p-2 text-primary transition hover:bg-primary/20"
                            title="Create Invoice"
                          >
                            <FileText size={16} />
                          </button>
                        )}
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
                    );
                  },
                },
              ]}
              renderCard={(request) => (
                <MaintenanceRequestCard
                  request={request}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  isInvoiced={isExpenseInvoiced(request.id)}
                  onCreateInvoice={handleCreateInvoice}
                />
              )}
            />
          )}
      </section>

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
                ? "Maintenance expense updated."
                : "Maintenance expense recorded.",
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
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {request ? "Edit Expense" : "Record Expense"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
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
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
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
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Date <span className="text-red-500">*</span>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
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
                  <label className="mb-1 block text-xs font-medium text-slate-700">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g., Living room, Kitchen"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Serviced By
                  </label>
                  <input
                    type="text"
                    value={formData.serviced_by}
                    onChange={(e) =>
                      setFormData({ ...formData, serviced_by: e.target.value })
                    }
                    placeholder="Vendor/Contractor name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Vendor Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_number: e.target.value })
                  }
                  placeholder="Optional - external invoice number"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-900">
                  Billing Options
                </h3>
                <div className="space-y-2.5">
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
                      <span className="text-xs font-medium text-slate-700">
                        Billable Expense
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Uncheck for non-billable expenses (e.g., routine inspection).
                      </p>
                    </div>
                  </label>

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
                      <span className="text-xs font-medium text-slate-700">
                        Billed to Tenant
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Tenant will be charged. Create invoice separately to bill.
                      </p>
                    </div>
                  </label>

                  {formData.billed_to_tenant && (
                    <div className="ml-6">
                      <label className="mb-1 block text-xs font-medium text-slate-700">
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : request
                  ? "Update"
                  : "Record"}
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


function MaintenanceRequestCard({ request, onEdit, onDelete, deletingId, isInvoiced, onCreateInvoice }) {
  const canCreateInvoice = request.is_billable && !isInvoiced;
  
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expense #{request.id}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {request.description}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {request.unit?.property?.name ?? "Unknown Property"} - Unit{" "}
            {request.unit?.unit_number ?? `#${request.unit_id}`}
          </p>
          {request.unit?.is_occupied && request.unit?.current_tenant && (
            <p className="mt-1 text-sm font-medium text-primary">
              Tenant: {request.unit.current_tenant.full_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <TypeBadge type={request.type ?? "repair"} />
          {request.is_billable && (
            isInvoiced ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                <FileText size={12} />
                Invoiced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                Not Invoiced
              </span>
            )
          )}
          <div className="flex items-center gap-2">
            {canCreateInvoice && (
              <button
                type="button"
                onClick={() => onCreateInvoice(request)}
                className="rounded-lg border border-primary bg-primary/10 p-1.5 text-primary transition hover:bg-primary/20"
                title="Create Invoice"
              >
                <FileText size={14} />
              </button>
            )}
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

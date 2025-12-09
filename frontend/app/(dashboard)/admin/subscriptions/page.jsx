"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Shield,
  Search,
  Filter,
  RefreshCcw,
  Edit,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Plus,
} from "lucide-react";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { SubscriptionStatusBadge } from "@/components/admin/SubscriptionStatusBadge";
import { UpdateSubscriptionModal } from "@/components/admin/UpdateSubscriptionModal";
import { ExtendSubscriptionModal } from "@/components/admin/ExtendSubscriptionModal";
import { API_BASE_URL } from "@/utils/api-config";
import { logger } from "@/utils/logger";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminSubscriptionsPage() {
  const {
    fetchAllLandlords,
    updateLandlordSubscription,
    extendSubscription,
    suspendSubscription,
    activateSubscription,
    loading,
    error,
  } = useAdminSubscriptions();

  const [landlords, setLandlords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expiresBefore, setExpiresBefore] = useState("");
  const [expiresAfter, setExpiresAfter] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLandlords() {
      try {
        const filters = {
          search: search || undefined,
          subscription_tier: tierFilter !== "all" ? tierFilter : undefined,
          subscription_status: statusFilter !== "all" ? statusFilter : undefined,
          expires_before: expiresBefore || undefined,
          expires_after: expiresAfter || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          per_page: 50,
          page: currentPage,
        };

        const response = await fetchAllLandlords(filters);
        if (!isMounted) return;

        setLandlords(response?.data || []);
        setPagination({
          current_page: response?.current_page || 1,
          last_page: response?.last_page || 1,
          per_page: response?.per_page || 50,
          total: response?.total || 0,
        });
      } catch (err) {
        if (!isMounted) return;
        // Use logger instead of console.error
        if (process.env.NODE_ENV === 'development') {
          logger.error("Failed to load landlords:", err);
        }
        
        // Provide concise error message
        let errorMessage = err.message || "Failed to load landlords. Please check your connection and try again.";
        
        // Check if it's a network error - show concise message
        if (err.message?.includes("Unable to connect")) {
          errorMessage = "Unable to connect to server. Please ensure the backend is running.";
        }
        
        setFlashMessage({
          type: "error",
          text: errorMessage,
        });
      }
    }

    loadLandlords();

    return () => {
      isMounted = false;
    };
  }, [
    refreshKey,
    currentPage,
    search,
    tierFilter,
    statusFilter,
    expiresBefore,
    expiresAfter,
    sortBy,
    sortOrder,
    fetchAllLandlords,
  ]);

  useEffect(() => {
    if (flashMessage) {
      const timeout = setTimeout(() => setFlashMessage(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [flashMessage]);

  const handleUpdate = (landlord) => {
    setSelectedLandlord(landlord);
    setUpdateModalOpen(true);
  };

  const handleExtend = (landlord) => {
    setSelectedLandlord(landlord);
    setExtendModalOpen(true);
  };

  const handleSuspend = async (landlord) => {
    if (!confirm(`Are you sure you want to suspend ${landlord.company_name}'s subscription?`)) {
      return;
    }

    try {
      await suspendSubscription(landlord.id);
      setFlashMessage({
        type: "success",
        text: "Subscription suspended successfully.",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFlashMessage({ type: "error", text: err.message });
    }
  };

  const handleActivate = async (landlord) => {
    try {
      await activateSubscription(landlord.id, 1);
      setFlashMessage({
        type: "success",
        text: "Subscription activated successfully.",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFlashMessage({ type: "error", text: err.message });
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setTierFilter("all");
    setStatusFilter("all");
    setExpiresBefore("");
    setExpiresAfter("");
    setSortBy("id");
    setSortOrder("desc");
  };

  const hasFilters =
    search ||
    tierFilter !== "all" ||
    statusFilter !== "all" ||
    expiresBefore ||
    expiresAfter;

  const formatCurrency = (value) => {
    return `MVR ${Number(value || 0).toLocaleString("en-MV", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Admin Panel
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Shield size={24} className="text-primary" />
            Subscription Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage all landlord subscriptions, view expiry dates, and update subscription tiers.
          </p>
        </div>
      </header>

      {/* Flash Message */}
      {flashMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            flashMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {flashMessage.text}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Error loading subscriptions</p>
            <p className="mt-1 whitespace-pre-line">{error}</p>
            <div className="mt-3 rounded border border-red-300 bg-red-100 p-3 text-xs">
              <p className="font-semibold mb-2">Quick Browser Test:</p>
              <p className="mb-2">Open browser console (F12) and check:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Is backend running? Test: <code className="bg-red-200 px-1 rounded">fetch('http://localhost:8000/api/v1')</code></li>
                <li>Are you logged in? Check: <code className="bg-red-200 px-1 rounded">localStorage.getItem('auth_token')</code></li>
                <li>What's your role? Test: <code className="bg-red-200 px-1 rounded">fetch('http://localhost:8000/api/v1/account', {`{headers: {Authorization: 'Bearer ' + localStorage.getItem('auth_token')}}`})</code></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {TIER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Expires After */}
          <input
            type="date"
            value={expiresAfter}
            onChange={(e) => setExpiresAfter(e.target.value || "")}
            placeholder="Expires after"
            suppressHydrationWarning
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {/* Expires Before */}
          <input
            type="date"
            value={expiresBefore}
            onChange={(e) => setExpiresBefore(e.target.value || "")}
            placeholder="Expires before"
            suppressHydrationWarning
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="id">ID</option>
            <option value="company_name">Company Name</option>
            <option value="subscription_tier">Tier</option>
            <option value="subscription_expires_at">Expiry Date</option>
            <option value="subscription_status">Status</option>
          </select>

          <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setCurrentPage(1); // Reset to first page when sort changes
                }}
            className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>

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

      {/* Landlords Table */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Landlords ({pagination.total || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Manage subscription tiers and expiry dates
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Loading landlords...</p>
            </div>
          </div>
        ) : landlords.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">
              {hasFilters
                ? "No landlords match your filters"
                : "No landlords found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {landlords.map((landlord) => (
                  <tr
                    key={landlord.id}
                    className="transition hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {landlord.company_name}
                      </div>
                      <div className="text-xs text-slate-500">ID: {landlord.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary uppercase">
                        {landlord.subscription_tier}
                      </span>
                      {landlord.subscription_limit && (
                        <div className="mt-1 text-xs text-slate-500">
                          {formatCurrency(landlord.subscription_limit.monthly_price)}/mo
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge
                        status={landlord.subscription_status}
                        daysUntilExpiry={landlord.days_until_expiry}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {landlord.subscription_expires_at ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {new Date(
                              landlord.subscription_expires_at
                            ).toLocaleDateString()}
                          </div>
                          {landlord.days_until_expiry !== null && (
                            <div className="text-xs text-slate-500">
                              {landlord.days_until_expiry < 0
                                ? `${Math.abs(landlord.days_until_expiry)} days ago`
                                : `${landlord.days_until_expiry} days left`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Never expires</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">
                        <div>
                          {landlord.usage?.properties_count || 0} /{" "}
                          {landlord.subscription_limit?.max_properties || "∞"} properties
                        </div>
                        <div>
                          {landlord.usage?.units_count || 0} /{" "}
                          {landlord.subscription_limit?.max_units || "∞"} units
                        </div>
                        <div>
                          {landlord.usage?.users_count || 0} /{" "}
                          {landlord.subscription_limit?.max_users || "∞"} users
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {landlord.owner ? (
                        <div>
                          <div className="font-medium text-slate-900">
                            {landlord.owner.full_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {landlord.owner.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No owner</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdate(landlord)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
                          title="Update Subscription"
                        >
                          <Edit size={16} />
                        </button>
                        {landlord.subscription_tier !== "basic" &&
                          landlord.subscription_status === "active" && (
                            <button
                              type="button"
                              onClick={() => handleExtend(landlord)}
                              className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-blue-600 transition hover:bg-blue-100"
                              title="Extend Subscription"
                            >
                              <Calendar size={16} />
                            </button>
                          )}
                        {landlord.subscription_status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleSuspend(landlord)}
                            className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 text-amber-600 transition hover:bg-amber-100"
                            title="Suspend Subscription"
                          >
                            <PauseCircle size={16} />
                          </button>
                        )}
                        {landlord.subscription_status !== "active" && (
                          <button
                            type="button"
                            onClick={() => handleActivate(landlord)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100"
                            title="Activate Subscription"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{" "}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{" "}
              {pagination.total} landlords
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.current_page === 1}
                onClick={() => {
                  if (pagination.current_page > 1) {
                    setCurrentPage(pagination.current_page - 1);
                  }
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-600">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => {
                  if (pagination.current_page < pagination.last_page) {
                    setCurrentPage(pagination.current_page + 1);
                  }
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {updateModalOpen && selectedLandlord && (
        <UpdateSubscriptionModal
          landlord={selectedLandlord}
          onClose={() => {
            setUpdateModalOpen(false);
            setSelectedLandlord(null);
          }}
          onSuccess={() => {
            setFlashMessage({
              type: "success",
              text: "Subscription updated successfully.",
            });
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {extendModalOpen && selectedLandlord && (
        <ExtendSubscriptionModal
          landlord={selectedLandlord}
          onClose={() => {
            setExtendModalOpen(false);
            setSelectedLandlord(null);
          }}
          onSuccess={() => {
            setFlashMessage({
              type: "success",
              text: "Subscription extended successfully.",
            });
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Search,
  RefreshCcw,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Former", value: "former" },
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteState, setDeleteState] = useState({
    pendingId: null,
    errors: {},
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenants() {
      setLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load your tenants.",
          );
        }

        const url = new URL(`${API_BASE_URL}/tenants`);
        url.searchParams.set("per_page", "50");

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
            `Unable to load tenants (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setTenants(data);
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

    fetchTenants();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [statusFilter, refreshKey]);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tenants;
    }

    return tenants.filter((tenant) => {
      const haystack = [
        tenant?.full_name,
        tenant?.email,
        tenant?.phone,
        tenant?.alternate_phone,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystack.some((value) => value.includes(query));
    });
  }, [tenants, search]);

  const stats = useMemo(() => {
    const totals = tenants.reduce(
      (accumulator, tenant) => {
        accumulator.total += 1;

        const status = tenant?.status ?? "unknown";

        if (status === "active") {
          accumulator.active += 1;
        } else if (status === "inactive") {
          accumulator.inactive += 1;
        } else if (status === "former") {
          accumulator.former += 1;
        }

        if (tenant?.email) {
          accumulator.withEmail += 1;
        }

        if (tenant?.created_at) {
          const createdAt = new Date(tenant.created_at);
          if (!Number.isNaN(createdAt.valueOf())) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (createdAt >= thirtyDaysAgo) {
              accumulator.recent += 1;
            }
          }
        }

        return accumulator;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
        former: 0,
        withEmail: 0,
        recent: 0,
      },
    );

    const contactCoverage =
      totals.total > 0
        ? Math.round((totals.withEmail / totals.total) * 100)
        : 0;

    return { ...totals, contactCoverage };
  }, [tenants]);

  const hasFilters =
    statusFilter !== "all" || search.trim().length > 0;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
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
          "No API token found. Log in first so we can load additional tenants.",
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
          `Unable to load more tenants (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setTenants((previous) => [...previous, ...data]);
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

  const handleDeleteTenant = useCallback(async (tenantId) => {
    if (!tenantId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this tenant? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleteState((previous) => ({
      pendingId: tenantId,
      errors: { ...previous.errors, [tenantId]: null },
    }));

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before deleting a tenant.");
      }

      const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete tenant (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setTenants((previous) =>
        previous.filter((tenant) => tenant.id !== tenantId),
      );
      setMeta((previous) => {
        if (!previous) {
          return previous;
        }

        const nextTotal =
          typeof previous.total === "number" && previous.total > 0
            ? previous.total - 1
            : previous.total;

        return {
          ...previous,
          total: nextTotal,
        };
      });
      setDeleteState((previous) => {
        const nextErrors = { ...previous.errors };
        delete nextErrors[tenantId];

        return {
          pendingId: null,
          errors: nextErrors,
        };
      });
    } catch (err) {
      const message =
        err?.message ?? "Something went wrong while deleting the tenant.";

      setDeleteState((previous) => ({
        pendingId: null,
        errors: {
          ...previous.errors,
          [tenantId]: message,
        },
      }));
    }
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users size={24} className="text-primary" />
            Tenants
          </h1>
          <p className="text-sm text-slate-600">
            Manage the residents and businesses across your portfolio. Review
            contact details, status changes, and quickly jump into lease files.
          </p>
        </div>

        <Link
          href="/tenants/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <UserPlus size={16} />
          Add tenant
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total tenants"
          value={stats.total}
          icon={<Users size={20} />}
          description="Across every property"
        />
        <SummaryCard
          title="Active tenants"
          value={stats.active}
          icon={<UserCheck size={20} />}
          description={
            stats.total > 0
              ? `${Math.round(
                  (stats.active / Math.max(stats.total, 1)) * 100,
                )}% of portfolio`
              : "No tenants yet"
          }
        />
        <SummaryCard
          title="At-risk tenants"
          value={stats.inactive + stats.former}
          icon={<UserX size={20} />}
          description={`Inactive ${stats.inactive} · Former ${stats.former}`}
        />
        <SummaryCard
          title="Recent additions"
          value={stats.recent}
          icon={<CalendarClock size={20} />}
          description={
            stats.total > 0
              ? `Email coverage ${stats.contactCoverage}%`
              : "Add your first tenant"
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[260px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or phone…"
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
        ) : filteredTenants.length === 0 && !loading ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <DataDisplay
              data={filteredTenants}
              loading={loading}
              loadingMessage="Fetching tenants…"
              emptyMessage={
                hasFilters
                  ? "No tenants match your filters"
                  : "No tenants yet"
              }
              columns={[
                {
                  key: "full_name",
                  label: "Tenant Name",
                  render: (value, item) => (
                    <div>
                      <div className="font-semibold text-slate-900">
                        {value ?? `Tenant #${item.id}`}
                      </div>
                      {item.email && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Mail size={12} />
                          {item.email}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <StatusBadge status={value ?? "unknown"} />,
                },
                {
                  key: "phone",
                  label: "Phone",
                  render: (value) => value ?? "—",
                },
                {
                  key: "email",
                  label: "Email",
                  render: (value) => value ?? "—",
                },
                {
                  key: "active_leases",
                  label: "Active Leases",
                  render: (_, item) => {
                    const activeLeases = Array.isArray(item?.active_leases)
                      ? item.active_leases.filter(
                          (lease) => lease?.status === "active" || !lease?.status,
                        )
                      : [];
                    return (
                      <span className="text-sm text-slate-700">
                        {activeLeases.length > 0
                          ? `${activeLeases.length} active`
                          : "None"}
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tenants/${item.id}`}
                        className="text-sm font-semibold text-primary transition hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                      <Link
                        href={`/tenants/${item.id}/edit`}
                        className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      {item.can_be_deleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTenant(item.id);
                          }}
                          disabled={deleteState.pendingId === item.id}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {deleteState.pendingId === item.id ? "Deleting…" : "Delete"}
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              renderCard={(tenant) => (
                <TenantCard
                  tenant={tenant}
                  onDelete={handleDeleteTenant}
                  isDeleting={deleteState.pendingId === tenant.id}
                  deleteError={deleteState.errors[tenant.id]}
                />
              )}
              onRowClick={(tenant) => {
                if (tenant.id) {
                  window.location.href = `/tenants/${tenant.id}`;
                }
              }}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>
                Showing {filteredTenants.length} of {tenants.length} loaded
                tenants
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

function TenantCard({ tenant, onDelete, isDeleting, deleteError }) {
  const tenantId = tenant?.id;
  const status = tenant?.status ?? "unknown";
  const email = tenant?.email;
  const phone = tenant?.phone;
  const alternatePhone = tenant?.alternate_phone;
  const emergencyName = tenant?.emergency_contact_name;
  const emergencyPhone = tenant?.emergency_contact_phone;
  const idProofType = tenant?.id_proof_type;
  const idProofNumber = tenant?.id_proof_number;
  const canDelete = Boolean(tenant?.can_be_deleted);

  const activeLeases = Array.isArray(tenant?.active_leases)
    ? tenant.active_leases.filter(
        (lease) => lease?.status === "active" || !lease?.status,
      )
    : null;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tenant
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {tenant?.full_name ?? `Tenant #${tenantId}`}
          </h3>
          {email ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Mail size={14} />
              {email}
            </p>
          ) : null}
        </div>
        <StatusBadge status={status} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <InfoItem
          icon={<Phone size={16} />}
          label="Primary phone"
          value={phone ?? "Not provided"}
        />
        <InfoItem
          icon={<Phone size={16} />}
          label="Alternate"
          value={alternatePhone ?? "—"}
        />
        <InfoItem
          icon={<Phone size={16} />}
          label="Emergency contact"
          value={
            emergencyName || emergencyPhone
              ? [emergencyName, emergencyPhone].filter(Boolean).join(" · ")
              : "Not provided"
          }
        />
        <InfoItem
          icon={<Shield size={16} />}
          label="ID proof"
          value={
            idProofType || idProofNumber
              ? `${formatIdProofType(idProofType)}${
                  idProofNumber ? ` · ${idProofNumber}` : ""
                }`
              : "Not uploaded"
          }
        />
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        {activeLeases ? (
          <p className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            {activeLeases.length > 0
              ? `${activeLeases.length} active ${
                  activeLeases.length === 1 ? "lease" : "leases"
                }`
              : "No active leases"}
          </p>
        ) : (
          <p className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            Lease summary unavailable
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={tenantId ? `/tenants/${tenantId}` : "#"}
            className="text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            View tenant →
          </Link>
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete?.(tenantId)}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete
                </>
              )}
            </button>
          ) : null}
          <span className="text-xs text-slate-400">
            Added {formatDate(tenant?.created_at)}
          </span>
        </div>
      </div>
      {deleteError ? (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {deleteError}
        </p>
      ) : null}
    </article>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-success/10 text-success",
    inactive: "bg-warning/10 text-warning",
    former: "bg-danger/10 text-danger",
    unknown: "bg-slate-200 text-slate-600",
  };

  const normalized = status && styles[status] ? status : "unknown";
  const label = normalized === "unknown" ? "Unknown" : capitalize(status);

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[normalized]}`}
    >
      {label}
    </span>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching tenants…
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
          We couldn&apos;t load your tenants
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
        <Users size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters
            ? "No tenants match your filters"
            : "No tenants recorded yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Add your first tenant to start tracking leases and communications."}
        </p>
      </div>
      <Link
        href="/tenants/new"
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <UserPlus size={16} />
        Add a tenant
      </Link>
    </div>
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

function formatIdProofType(value) {
  if (!value) {
    return "Not set";
  }

  const normalized = value.toString().toLowerCase();
  const labels = {
    aadhaar: "National ID",
    national_id: "National ID",
    passport: "Passport",
    other: "Other",
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return value
    .toString()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}



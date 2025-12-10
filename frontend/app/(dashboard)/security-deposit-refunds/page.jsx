"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

const formatDisplayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toAmount = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

import { formatMVR as formatCurrency } from "@/lib/currency";

const firstError = (error) => {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
};

const summaryTone = (tone) => {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
};

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function SecurityDepositRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [tenantUnits, setTenantUnits] = useState([]);
  const [optionsError, setOptionsError] = useState(null);

  const [flashMessage, setFlashMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  const {
    options: paymentMethodOptions,
    methods: paymentMethods,
    loading: paymentMethodLoading,
    error: paymentMethodError,
    refresh: refreshPaymentMethods,
  } = usePaymentMethods({ onlyActive: true });

  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
    }
  }, [hydrated]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchRefunds() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in so we can load security deposit refunds.");
        }

        const url = new URL(`${API_BASE_URL}/security-deposit-refunds`);
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
            `Unable to load security deposit refunds (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        setRefunds(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRefunds();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenantUnits() {
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in so we can load tenant unit information.");
        }

        const response = await fetch(`${API_BASE_URL}/tenant-units?per_page=200`, {
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
        if (!isMounted) return;
        setTenantUnits(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (!isMounted) return;
        setOptionsError(err.message);
      }
    }

    fetchTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const timeout = setTimeout(() => setFlashMessage(null), 3200);
    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const tenantUnitMap = useMemo(() => {
    return tenantUnits.reduce((acc, unit) => {
      if (unit?.id) {
        acc.set(unit.id, unit);
      }
      return acc;
    }, new Map());
  }, [tenantUnits]);

  const filteredRefunds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return refunds;
    }

    return refunds.filter((refund) => {
      const tenantName =
        refund?.tenant_unit?.tenant?.full_name ??
        tenantUnitMap.get(refund?.tenant_unit_id)?.tenant?.full_name ??
        "";
      const unitNumber =
        refund?.tenant_unit?.unit?.unit_number ??
        tenantUnitMap.get(refund?.tenant_unit_id)?.unit?.unit_number ??
        "";

      return [refund?.refund_number, tenantName, unitNumber]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [refunds, search, tenantUnitMap]);

  const stats = useMemo(() => {
    return filteredRefunds.reduce(
      (acc, refund) => {
        acc.total += 1;
        const deposit = toAmount(refund?.original_deposit);
        const returned = toAmount(refund?.refund_amount);
        acc.totalHeld += deposit;
        acc.totalRefunded += returned;
        if (refund?.status === "pending") {
          acc.pending += returned;
        }
        return acc;
      },
      { total: 0, totalHeld: 0, totalRefunded: 0, pending: 0 },
    );
  }, [filteredRefunds]);

  const tenantUnitOptions = useMemo(() => {
    return tenantUnits
      .map((unit) => {
        const tenant = unit?.tenant?.full_name ?? `Tenant #${unit?.tenant_id}`;
        const labelUnit =
          unit?.unit?.unit_number ??
          (unit?.unit?.id ? `Unit #${unit.unit.id}` : `Unit #${unit?.unit_id}`);
        return {
          value: String(unit.id),
          label: `${tenant} · ${labelUnit}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenantUnits]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const updateRefundStatus = async (refundId, status) => {
    if (!refundId || updatingId) return;

    setUpdatingId(refundId);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before updating a refund.");
      }

      const response = await fetch(
        `${API_BASE_URL}/security-deposit-refunds/${refundId}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to update refund (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const refund = result?.data ?? result;

      setRefunds((previous) =>
        previous.map((item) => (item.id === refund.id ? refund : item)),
      );
      setFlashMessage("Refund updated.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintReceipt = async (refund) => {
    if (!refund || printingId) return;

    try {
      setPrintingId(refund.id);

      const tenantUnit =
        refund?.tenant_unit ??
        (refund?.tenant_unit_id ? tenantUnitMap.get(refund.tenant_unit_id) : null);

      const paymentMethod = paymentMethods.find(
        (method) => method.name === refund?.payment_method,
      );

      const html = buildReceiptHtml({ refund, tenantUnit, paymentMethod });
      const iframe = document.createElement("iframe");

      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";

      document.body.appendChild(iframe);

      const print = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }
      };

      iframe.onload = print;
      iframe.srcdoc = html;
    } catch (err) {
      setFlashMessage(err.message ?? "Unable to open receipt for printing.");
    } finally {
      setPrintingId(null);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-slate-400">
        Loading…
      </div>
    );
  }

  const filteredBySearch = filteredRefunds;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Deposit management
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <ShieldCheck size={24} className="text-primary" />
            Security deposit refunds
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Record deposit returns to tenants, track outstanding refunds, and retain a basic audit
            of deductions taken from each lease.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/security-deposit-refunds/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            New refund
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Refund records" value={stats.total} tone="info" />
        <SummaryCard
          title="Deposits held (records)"
          value={formatCurrency(stats.totalHeld)}
          tone="warning"
        />
        <SummaryCard
          title="Deposits refunded"
          value={formatCurrency(stats.totalRefunded)}
          tone="success"
        />
        <SummaryCard
          title="Pending refunds"
          value={formatCurrency(stats.pending)}
          tone="danger"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by refund number, tenant, or unit…"
              suppressHydrationWarning
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {optionsError ? (
          <p className="mt-3 text-xs text-red-500">
            {optionsError} — tenant options may be limited.
          </p>
        ) : null}
        {paymentMethodError ? (
          <p className="mt-1 text-xs text-red-500">
            {paymentMethodError}
          </p>
        ) : null}
      </section>

      {/* Form removed from list page; use the full-page route /security-deposit-refunds/new */}

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-700">
            {flashMessage}
          </div>
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : filteredBySearch.length === 0 && !loading ? (
          <EmptyState hasFilters={Boolean(search.trim()) || statusFilter !== "all"} />
        ) : (
          <DataDisplay
            data={filteredBySearch}
            loading={loading}
            loadingMessage="Loading security deposit refunds…"
            emptyMessage={
              Boolean(search.trim()) || statusFilter !== "all"
                ? "No refunds match your filters"
                : "No security deposit refunds yet"
            }
            columns={[
              {
                key: "refund_number",
                label: "Refund",
                render: (value, item) => (
                  <div>
                    <div className="font-semibold text-slate-900">
                      {value ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Created {formatDisplayDate(item?.created_at ?? item?.refund_date)}
                    </div>
                  </div>
                ),
              },
              {
                key: "tenant_unit",
                label: "Tenant / Unit",
                render: (_, item) => {
                  const tenantUnit =
                    item?.tenant_unit ??
                    (item?.tenant_unit_id
                      ? tenantUnitMap.get(item.tenant_unit_id)
                      : null);
                  const tenantName =
                    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
                  const unitLabel =
                    tenantUnit?.unit?.unit_number ??
                    (tenantUnit?.unit?.id
                      ? `Unit #${tenantUnit.unit.id}`
                      : tenantUnit?.unit_id
                      ? `Unit #${tenantUnit.unit_id}`
                      : "Unassigned");
                  return (
                    <div>
                      <div className="font-semibold text-slate-900">{tenantName}</div>
                      <div className="text-xs text-slate-500">{unitLabel}</div>
                    </div>
                  );
                },
              },
              {
                key: "refund_date",
                label: "Refund Date",
                render: (value) => formatDisplayDate(value),
              },
              {
                key: "original_deposit",
                label: "Deposit",
                render: (value) => formatCurrency(value),
              },
              {
                key: "refund_amount",
                label: "Refunded",
                render: (value) => (
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(value)}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (value) => <StatusBadge status={value ?? "pending"} />,
              },
              {
                key: "actions",
                label: "Actions",
                render: (_, item) => {
                  const status = item?.status ?? "";
                  const updating = updatingId === item.id;
                  const printing = printingId === item.id;
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      {status !== "processed" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateRefundStatus(item.id, "processed");
                          }}
                          disabled={updating}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Mark processed
                        </button>
                      )}
                      {status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateRefundStatus(item.id, "cancelled");
                          }}
                          disabled={updating}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <AlertTriangle size={14} />
                          )}
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintReceipt(item);
                        }}
                        disabled={printing}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        {printing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Printer size={14} />
                        )}
                        Print receipt
                      </button>
                    </div>
                  );
                },
              },
            ]}
            renderCard={(refund) => (
              <RefundCard
                refund={refund}
                tenantUnitMap={tenantUnitMap}
                onMarkProcessed={() => updateRefundStatus(refund.id, "processed")}
                onCancel={() => updateRefundStatus(refund.id, "cancelled")}
                onPrint={() => handlePrintReceipt(refund)}
                updating={updatingId === refund.id}
                printing={printingId === refund.id}
              />
            )}
          />
        )}
      </section>
    </div>
  );
}

function RefundCard({
  refund,
  tenantUnitMap,
  onMarkProcessed,
  onCancel,
  onPrint,
  updating,
  printing,
}) {
  const tenantUnit =
    refund?.tenant_unit ??
    (refund?.tenant_unit_id ? tenantUnitMap.get(refund.tenant_unit_id) : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const status = refund?.status ?? "pending";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Refund
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {refund?.refund_number ?? "—"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDisplayDate(refund?.created_at ?? refund?.refund_date)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Tenant / Unit</dt>
          <dd className="mt-1 font-semibold text-slate-900">{tenantName}</dd>
          <dd className="text-xs text-slate-500">{unitLabel}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Refund Date</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatDisplayDate(refund?.refund_date)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Deposit</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatCurrency(refund?.original_deposit)}
            </dd>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Refunded</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(refund?.refund_amount)}
          </dd>
          {refund?.deductions > 0 && (
            <dd className="mt-1 text-xs text-slate-500">
              Deductions: {formatCurrency(refund.deductions)}
            </dd>
          )}
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {status !== "processed" && (
          <button
            type="button"
            onClick={onMarkProcessed}
            disabled={updating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {updating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Mark processed
          </button>
        )}
        {status !== "cancelled" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {updating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AlertTriangle size={14} />
            )}
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          disabled={printing}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {printing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Printer size={14} />
          )}
          Print receipt
        </button>
      </div>
    </article>
  );
}

const SummaryCard = ({ title, value, tone = "default" }) => {
  const toneClasses = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${
        toneClasses[tone] ?? toneClasses.default
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const config = {
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
    },
    processed: {
      label: "Processed",
      className: "bg-emerald-100 text-emerald-600",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-slate-200 text-slate-700",
    },
  };

  const tone = config[status] ?? config.pending;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      {tone.label}
    </span>
  );
};

const Loader = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
    <p className="text-sm font-medium text-slate-600">{message}</p>
    <p className="text-xs text-slate-400">
      This may take a moment if the API needs to wake up.
    </p>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertTriangle size={24} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-800">
        We couldn&apos;t load security deposit refunds
      </p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <p className="mt-2 text-xs text-slate-400">
        Ensure you&apos;re logged in and the API server is reachable at {""}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{API_BASE_URL}</code>
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

const EmptyState = ({ hasFilters }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <ShieldCheck size={24} />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-800">
        {hasFilters ? "No refunds match your filters" : "No refund records yet"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {hasFilters
          ? "Adjust your filters or clear search to see more results."
          : "Record your first refund using the form above."}
      </p>
    </div>
  </div>
);

const buildReceiptHtml = ({ refund, tenantUnit, paymentMethod }) => {
  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const propertyName = tenantUnit?.unit?.property?.name ?? "";

  const deductions = Array.isArray(refund?.deduction_reasons)
    ? refund.deduction_reasons
    : [];

  const paymentLabel = paymentMethod?.name ?? refund?.payment_method ?? "—";

  const today = new Date();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Security Deposit Refund Receipt</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
      }
      .wrapper {
        max-width: 720px;
        margin: 32px auto;
        padding: 32px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 40px -15px rgba(15, 23, 42, 0.25);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
      }
      .meta {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .section-title {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #475569;
        margin-bottom: 8px;
      }
      .card {
        padding: 16px;
        border-radius: 12px;
        background: #f1f5f9;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
        font-size: 14px;
      }
      th, td {
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
      }
      th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #475569;
      }
      .totals {
        margin-top: 24px;
        display: flex;
        justify-content: flex-end;
        gap: 48px;
        font-size: 15px;
      }
      .totals span {
        display: block;
      }
      footer {
        margin-top: 32px;
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <header>
        <h1>Security Deposit Refund Receipt</h1>
        <p class="meta">Generated on ${formatDisplayDate(today)} · Refund #${
          refund?.refund_number ?? "—"
        }</p>
      </header>

      <section class="grid">
        <div class="card">
          <div class="section-title">Tenant information</div>
          <p><strong>Tenant:</strong> ${tenantName}</p>
          <p><strong>Unit:</strong> ${unitLabel}</p>
          ${propertyName ? `<p><strong>Property:</strong> ${propertyName}</p>` : ""}
        </div>
        <div class="card">
          <div class="section-title">Refund details</div>
          <p><strong>Refund date:</strong> ${formatDisplayDate(refund?.refund_date)}</p>
          <p><strong>Status:</strong> ${refund?.status ?? "pending"}</p>
          <p><strong>Receipt number:</strong> ${refund?.receipt_number ?? "—"}</p>
        </div>
        <div class="card">
          <div class="section-title">Payment</div>
          <p><strong>Method:</strong> ${paymentLabel}</p>
          <p><strong>Reference:</strong> ${refund?.transaction_reference ?? "—"}</p>
        </div>
      </section>

      <section>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (MVR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Original security deposit</td>
              <td>${formatCurrency(refund?.original_deposit)}</td>
            </tr>
            <tr>
              <td>Deductions retained</td>
              <td>${formatCurrency(refund?.deductions)}</td>
            </tr>
            <tr>
              <td><strong>Amount refunded to tenant</strong></td>
              <td><strong>${formatCurrency(refund?.refund_amount)}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>

      ${
        deductions.length > 0
          ? `<section>
              <div class="section-title">Deduction breakdown</div>
              <table>
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Amount (MVR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${deductions
                    .map(
                      (item) => `<tr>
                        <td>
                          <strong>${item?.category ?? "Unspecified"}</strong><br />
                          ${item?.note ? item.note : ""}
                        </td>
                        <td>${formatCurrency(item?.amount)}</td>
                      </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </section>`
          : ""
      }

      <footer>
        This receipt confirms the return of the tenant's security deposit. Please retain a copy
        for your records.
      </footer>
    </div>
  </body>
</html>`;
};


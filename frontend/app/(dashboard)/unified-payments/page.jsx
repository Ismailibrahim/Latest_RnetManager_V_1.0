"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  Filter,
  RefreshCcw,
  Search,
  CircleDollarSign,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

const paymentTypeOptions = [
  { value: "all", label: "All payment types" },
  { value: "rent", label: "Rent" },
  { value: "maintenance_expense", label: "Maintenance expense" },
  { value: "security_refund", label: "Security deposit refund" },
];

const flowDirectionOptions = [
  { value: "all", label: "All flows" },
  { value: "income", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const INITIAL_FILTERS = {
  payment_type: "all",
  flow_direction: "all",
  status: "all",
  from: "",
  to: "",
};

const PENDING_STATUSES = new Set([
  "pending",
  "processing",
  "scheduled",
  "initiated",
  "awaiting",
  "awaiting_settlement",
]);

export default function UnifiedPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnifiedPayments() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "Please log in so we can load unified payments from the API.",
          );
        }

        const url = new URL(`${API_BASE_URL}/reports/unified-payments`);
        url.searchParams.set("per_page", "50");

        if (filters.payment_type !== "all") {
          url.searchParams.set("payment_type", filters.payment_type);
        }

        if (filters.flow_direction !== "all") {
          url.searchParams.set("flow_direction", filters.flow_direction);
        }

        if (filters.status !== "all") {
          url.searchParams.set("status", filters.status);
        }

        if (filters.from) {
          url.searchParams.set("from", filters.from);
        }

        if (filters.to) {
          url.searchParams.set("to", filters.to);
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
            `Unable to load unified payments (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setPayments(data);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
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

    fetchUnifiedPayments();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [
    filters.payment_type,
    filters.flow_direction,
    filters.status,
    filters.from,
    filters.to,
    refreshKey,
  ]);

  const filteredPayments = useMemo(() => {
    if (!search.trim()) {
      return payments;
    }

    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const tenantName = payment?.tenant_name ?? "";
      const vendorName = payment?.vendor_name ?? "";
      const reference = payment?.reference_number ?? "";
      const description = payment?.description ?? "";
      const invoice = payment?.invoice_number ?? "";

      return [tenantName, vendorName, reference, description, invoice]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [payments, search]);

  const stats = useMemo(() => {
    return filteredPayments.reduce(
      (accumulator, payment) => {
        const amount = toAmount(payment?.amount);
        const flow = payment?.flow_direction;
        const status = (payment?.status ?? "").toLowerCase();

        accumulator.count += 1;
        accumulator.totalAmount += amount;

        if (flow === "income") {
          accumulator.income += amount;
        } else if (flow === "outgoing") {
          accumulator.outgoing += amount;
        }

        if (PENDING_STATUSES.has(status)) {
          accumulator.pending += 1;
        }

        return accumulator;
      },
      { count: 0, income: 0, outgoing: 0, totalAmount: 0, pending: 0 },
    );
  }, [filteredPayments]);

  const statusSummary = useMemo(() => {
    const map = new Map();

    filteredPayments.forEach((payment) => {
      const status = payment?.status ?? "Unknown";
      const amount = toAmount(payment?.amount);

      if (!map.has(status)) {
        map.set(status, { count: 0, total: 0 });
      }

      const entry = map.get(status);
      entry.count += 1;
      entry.total += amount;
    });

    return Array.from(map.entries())
      .map(([status, values]) => ({
        status,
        count: values.count,
        total: values.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredPayments]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleFilterChange = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSearch("");
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
        throw new Error("Please log in so we can load additional payments.");
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
          `Unable to load more payments (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setPayments((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const merged = [...previous];

        data.forEach((item) => {
          if (item?.id && !existingIds.has(item.id)) {
            merged.push(item);
          }
        });

        return merged;
      });

      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      setLoadMoreError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Cash flow across the portfolio
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Filter size={22} className="text-primary" />
            Unified payments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monitor every incoming and outgoing payment across rent, expenses,
            and refunds in a single ledger view. Filter by flow direction,
            status, and timeframe to identify trends or exceptions instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/payments/collect"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <CircleDollarSign size={16} />
            Collect payment
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Transactions loaded"
          value={stats.count}
          subtitle={
            stats.pending > 0
              ? `${stats.pending} awaiting settlement`
              : "All settled"
          }
          tone="default"
          icon={Filter}
        />
        <SummaryCard
          title="Money in"
          value={formatCurrency(stats.income)}
          subtitle="Across rent + deposits"
          tone="success"
          icon={ArrowDownCircle}
        />
        <SummaryCard
          title="Money out"
          value={formatCurrency(stats.outgoing)}
          subtitle="Vendor & refund payouts"
          tone="danger"
          icon={ArrowUpCircle}
        />
        <SummaryCard
          title="Net cash impact"
          value={formatCurrency(stats.income - stats.outgoing)}
          subtitle="Income − outgoing"
          tone={stats.income - stats.outgoing >= 0 ? "success" : "danger"}
          icon={CalendarRange}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tenant, vendor, reference…"
                suppressHydrationWarning
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Select
              label="Payment type"
              value={filters.payment_type}
              onChange={(event) =>
                handleFilterChange("payment_type", event.target.value)
              }
              options={paymentTypeOptions}
            />

            <Select
              label="Flow"
              value={filters.flow_direction}
              onChange={(event) =>
                handleFilterChange("flow_direction", event.target.value)
              }
              options={flowDirectionOptions}
            />

            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
              options={statusOptions}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <DateInput
              label="From"
              value={filters.from}
              onChange={(event) => handleFilterChange("from", event.target.value)}
            />
            <DateInput
              label="To"
              value={filters.to}
              onChange={(event) => handleFilterChange("to", event.target.value)}
            />

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>
        </div>

        {statusSummary.length > 0 ? (
          <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
            {statusSummary.map((entry) => (
              <div
                key={entry.status}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {entry.status}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(entry.total)}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.count} transaction{entry.count !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
        {error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : filteredPayments.length === 0 && !loading ? (
          <EmptyState hasFilters={hasActiveFilters(filters, search)} />
        ) : (
          <>
            <DataDisplay
              data={filteredPayments}
              loading={loading}
              loadingMessage="Loading unified payments…"
              emptyMessage={
                hasActiveFilters(filters, search)
                  ? "No payments match your filters"
                  : "No payments yet"
              }
              columns={[
                {
                  key: "transaction_date",
                  label: "Date",
                  render: (value, item) => (
                    <div>
                      <div className="font-semibold text-slate-900">
                        {formatDate(value)}
                      </div>
                      {item.due_date && (
                        <div className="text-xs text-slate-500">
                          Due {formatDate(item.due_date)}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "payment_type",
                  label: "Type",
                  render: (value) => (
                    <span className="capitalize text-slate-700">
                      {normalizeLabel(value)}
                    </span>
                  ),
                },
                {
                  key: "flow_direction",
                  label: "Flow",
                  render: (value) => <FlowBadge flow={value ?? "income"} />,
                },
                {
                  key: "amount",
                  label: "Amount",
                  render: (value, item) => {
                    const amount = toAmount(value);
                    const flow = item?.flow_direction ?? "income";
                    const isIncome = flow === "income";
                    return (
                      <span
                        className={`text-sm font-semibold ${
                          isIncome ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(amount)}
                      </span>
                    );
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <StatusBadge status={value} />,
                },
                {
                  key: "tenant_name",
                  label: "Tenant / Vendor",
                  render: (_, item) => (
                    <div className="text-xs text-slate-600">
                      {item.tenant_name && (
                        <div className="font-medium text-slate-800">
                          {item.tenant_name}
                        </div>
                      )}
                      {item.vendor_name && (
                        <div className="text-xs text-slate-500">
                          {item.vendor_name}
                        </div>
                      )}
                      {!item.tenant_name && !item.vendor_name && "—"}
                    </div>
                  ),
                },
                {
                  key: "reference_number",
                  label: "Reference",
                  render: (value) => (
                    <span className="text-xs font-medium text-slate-700">
                      {value ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "description",
                  label: "Description",
                  render: (value) => (
                    <span className="text-xs text-slate-600">
                      {value ?? "—"}
                    </span>
                  ),
                },
              ]}
              renderCard={(payment) => (
                <PaymentCard payment={payment} />
              )}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>{filteredPayments.length} payments shown</p>

              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                {loadMoreError ? (
                  <p className="text-xs text-red-500 sm:order-2 sm:pl-3">{loadMoreError}</p>
                ) : null}
                {pagination.nextUrl ? (
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
                ) : null}
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function PaymentRow({ payment }) {
  const amount = toAmount(payment?.amount);
  const flow = payment?.flow_direction ?? "income";
  const isIncome = flow === "income";

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-3 py-3 text-sm text-slate-600">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">
            {formatDate(payment?.transaction_date)}
          </span>
          {payment?.due_date ? (
            <span className="text-xs text-slate-500">
              Due {formatDate(payment.due_date)}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 capitalize text-sm text-slate-600">
        {normalizeLabel(payment?.payment_type)}
      </td>
      <td className="px-3 py-3">
        <FlowBadge flow={flow} />
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
        <span className={isIncome ? "text-emerald-600" : "text-red-600"}>
          {isIncome ? "+" : "-"}
          {formatCurrency(amount)}
        </span>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={payment?.status} />
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">
        <div className="flex flex-col">
          {payment?.tenant_name ? (
            <span className="font-medium text-slate-800">
              {payment.tenant_name}
            </span>
          ) : null}
          {payment?.vendor_name ? (
            <span className="text-xs text-slate-500">
              {payment.vendor_name}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-slate-500">
        <div className="flex flex-col">
          {payment?.reference_number ? (
            <span className="font-medium text-slate-700">
              {payment.reference_number}
            </span>
          ) : null}
          {payment?.invoice_number ? (
            <span className="text-xs text-slate-400">
              Invoice {payment.invoice_number}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-slate-500">
        {payment?.description ?? "—"}
      </td>
    </tr>
  );
}

function PaymentCard({ payment }) {
  const flow = payment?.flow_direction ?? "income";
  const amount = toAmount(payment?.amount);
  const isIncome = flow === "income";

  return (
    <article className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {formatDate(payment?.transaction_date)}
          </p>
          {payment?.due_date ? (
            <p className="text-xs text-slate-500">
              Due {formatDate(payment.due_date)}
            </p>
          ) : null}
        </div>
        <FlowBadge flow={flow} />
      </div>

      <p
        className={`mt-3 text-lg font-semibold ${
          isIncome ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {isIncome ? "+" : "-"}
        {formatCurrency(amount)}
      </p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {normalizeLabel(payment?.payment_type)}
      </p>

      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {payment?.tenant_name ? (
          <p className="font-medium text-slate-800">{payment.tenant_name}</p>
        ) : null}
        {payment?.vendor_name ? (
          <p className="text-xs text-slate-500">{payment.vendor_name}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {payment?.reference_number ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
            Ref {payment.reference_number}
          </span>
        ) : null}
        {payment?.invoice_number ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">
            Invoice {payment.invoice_number}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <StatusBadge status={payment?.status} />
      </div>

      {payment?.description ? (
        <p className="mt-3 text-xs text-slate-500">{payment.description}</p>
      ) : null}
    </article>
  );
}

function FlowBadge({ flow }) {
  const config = {
    income: {
      label: "Incoming",
      className:
        "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600",
      icon: ArrowDownCircle,
    },
    outgoing: {
      label: "Outgoing",
      className:
        "inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600",
      icon: ArrowUpCircle,
    },
  };

  const tone = config[flow] ?? config.income;
  const Icon = tone.icon;

  return (
    <span className={tone.className}>
      <Icon size={14} />
      {tone.label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase();

  const config = {
    completed: "bg-emerald-100 text-emerald-600",
    settled: "bg-emerald-100 text-emerald-600",
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-amber-100 text-amber-700",
    scheduled: "bg-sky-100 text-sky-700",
    failed: "bg-red-100 text-red-600",
    cancelled: "bg-slate-200 text-slate-700",
    refunded: "bg-purple-100 text-purple-600",
  };

  const className =
    config[normalized] ?? "bg-slate-200 text-slate-700";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {status}
    </span>
  );
}

function SummaryCard({ title, value, subtitle, tone = "default", icon: Icon }) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${summaryTone(
        tone,
      )}`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-white/70 p-2 text-primary shadow-sm">
          <Icon size={18} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {subtitle ? (
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
      <select
        value={value}
        onChange={onChange}
        className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function Loader({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <p className="text-xs text-slate-400">
        This may take a moment if the API needs to wake up.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn't load unified payments
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Ensure you're logged in and the API server is reachable at{" "}
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
}

function EmptyState({ hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Filter size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No payments match your filters" : "No payments yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Payments will appear here once transactions are recorded."}
        </p>
      </div>
    </div>
  );
}

function summaryTone(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}

function toAmount(value) {
  if (value === undefined || value === null) {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

import { formatMVR as formatCurrency } from "@/lib/currency";

function formatDate(value) {
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
}

function normalizeLabel(value) {
  if (!value) return "—";

  return value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasActiveFilters(filters, search) {
  if (search.trim()) return true;
  return (
    filters.payment_type !== INITIAL_FILTERS.payment_type ||
    filters.flow_direction !== INITIAL_FILTERS.flow_direction ||
    filters.status !== INITIAL_FILTERS.status ||
    Boolean(filters.from) ||
    Boolean(filters.to)
  );
}


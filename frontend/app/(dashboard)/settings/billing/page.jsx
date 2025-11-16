"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function formatCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined) {
    return "—";
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPeriod(start, end) {
  if (!start && !end) return "—";
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate && endDate) return formatDate(endDate);
  if (!endDate && startDate) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(startDate);
  }
  if (!startDate || !endDate || Number.isNaN(startDate) || Number.isNaN(endDate)) {
    return "—";
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  });
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();

  return sameMonth
    ? formatter.format(startDate)
    : `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

function titleCase(value) {
  if (!value) return "—";
  return value
    .toString()
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1));
}

export default function BillingSettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchBillingSettings() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("You must be signed in to view billing settings.");
        }

        const response = await fetch(`${API_BASE_URL}/settings/billing`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message ??
              `Unable to load billing settings (HTTP ${response.status}).`,
          );
        }

        if (isMounted) {
          setData(payload);
        }
      } catch (exception) {
        if (isMounted) {
          setError(
            exception?.message ?? "We could not load billing settings right now.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBillingSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const planFeatures = useMemo(
    () => data?.plan?.features ?? [],
    [data?.plan?.features],
  );

  const usageMetrics = useMemo(
    () => data?.usage ?? [],
    [data?.usage],
  );

  const invoices = useMemo(
    () => data?.invoices ?? [],
    [data?.invoices],
  );

  const receiptEmails = useMemo(
    () => data?.preferences?.receipt_emails ?? [],
    [data?.preferences?.receipt_emails],
  );

  const billingContacts = useMemo(
    () => data?.preferences?.billing_contacts ?? [],
    [data?.preferences?.billing_contacts],
  );

  const plan = data?.plan;

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="badge">
            <ShieldCheck size={14} />
            Subscription
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Billing & Subscription Settings
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage your RentApplicaiton plan, payment method, and invoices. All
            charges are processed securely in USD and mirrored to your financial
            dashboards.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            Next renewal on{" "}
            <strong>{formatDate(plan?.next_renewal_date)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            Need help? Contact <strong>billing@rentapp.test</strong>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">
                Unable to load billing settings
              </p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Current plan
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {loading
                ? "Loading…"
                : `${plan?.name ?? "—"} (${formatCurrency(plan?.monthly_price, plan?.currency)}/mo)`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {
                "Best for growing portfolios that need automated billing and delegate workflows."
              }
            </p>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {planFeatures.length === 0 ? (
                <li className="text-xs text-slate-500">
                  Your plan features will appear here once configured.
                </li>
              ) : (
                planFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))
              )}
            </ul>
          )}
          <div className="flex flex-col gap-2 text-sm">
            <button
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
              disabled
            >
              Upgrade to Enterprise
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100">
              View available add-ons
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Usage overview
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              Monthly allocation
            </h3>
          </header>
          {loading ? (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <ul className="grid gap-3 text-sm text-slate-600">
              {usageMetrics.length === 0 ? (
                <li className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 text-xs text-slate-500">
                  Usage metrics are not available yet.
                </li>
              ) : (
                usageMetrics.map((metric) => (
                  <li
                    key={metric.key}
                    className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">
                        {metric.label}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        {metric.limit
                          ? `${metric.used} / ${metric.limit}`
                          : metric.used}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {metric.helper}
                    </p>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Payment method
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Corporate card (auto-pay enabled)
              </h3>
            </div>
          </header>
          <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Automatic payments</p>
            <p className="mt-1 text-xs text-slate-500">
              Renewal fee will be charged three days before your billing cycle
              refreshes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100">
              Update card
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100">
              Add backup method
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="card space-y-4" id="history">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Billing history
              </h3>
              <p className="text-xs text-slate-500">
                Download PDF invoices and sync with your accounting system.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Export CSV
            </button>
          </header>
          <div className="overflow-hidden rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-left font-semibold">Issued</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading invoices…
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No subscription invoices found yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        {formatPeriod(invoice.period_start, invoice.period_end)}
                      </td>
                      <td className="px-4 py-3">{formatDate(invoice.issued_at)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge">{titleCase(invoice.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                          disabled={!invoice.download_url}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Invoice preferences
            </h3>
            <p className="text-xs text-slate-500">
              Configure billing contacts and tax handling for Maldivian
              regulations.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Receipt emails</p>
            <p className="mt-1 text-xs text-slate-500">
              {receiptEmails.length === 0
                ? "Add at least one billing recipient to receive monthly invoices."
                : receiptEmails.join(", ")}
            </p>
            <button className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
              Manage recipients
            </button>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Billing contacts</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {billingContacts.length === 0 ? (
                <li>No delegates assigned as billing contacts yet.</li>
              ) : (
                billingContacts.map((contact) => (
                  <li key={contact.email}>
                    <span className="font-medium text-slate-700">
                      {contact.name}
                    </span>{" "}
                    · {contact.email} ({titleCase(contact.role)})
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Compliance</p>
            <p className="mt-1 text-xs text-slate-500">
              {data?.preferences?.compliance_note ??
                "All billing data is encrypted and stored in the ap-south-1 region with nightly backups."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


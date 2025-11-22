"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock4,
  FileText,
  PieChart,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

export default function FinancesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          throw new Error("Authentication token missing. Please log in and try again.");
        }
        
        const response = await fetch(`${API_BASE_URL}/financial-summary`, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch financial data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching financial data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-600">Error loading financial data: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summaryCards = data.summary_cards || [];
  const rentInvoices = data.rent_invoices || [];
  const renewalAlerts = data.renewal_alerts || [];
  const cashFlowEvents = data.cash_flow_events || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Portfolio cash insights
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wallet size={24} className="text-primary" />
            Finances
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track collections, cash flow, and upcoming renewals across the
            portfolio. Figures refresh with the nightly accounting sync from the
            property management system.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Rent collection pipeline
              </h2>
              <p className="text-xs text-slate-500">
                Invoices synced from accounting · auto-reconciled every 15 minutes.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Receipt size={14} />
              {rentInvoices.length} invoices
            </span>
          </header>

          <div className="overflow-x-auto">
            {rentInvoices.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No rent invoices found
              </div>
            ) : (
              <table className="min-w-[1200px] table-auto border-collapse text-sm text-slate-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Invoice</th>
                    <th className="px-3 py-2 font-semibold">Tenant / Unit</th>
                    <th className="px-3 py-2 font-semibold">Due</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Channel</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentInvoices.map((invoice) => (
                    <tr key={invoice.invoice} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                        {invoice.invoice}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {invoice.tenant}
                          </span>
                          <span className="text-xs text-slate-500">
                            {invoice.property}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {invoice.due}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        {invoice.amount}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {invoice.balance}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {invoice.channel}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Upcoming renewals
              </h2>
              <p className="text-xs text-slate-500">
                Automatic reminders issue 45 days before renewal.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {renewalAlerts.length === 0 ? (
              <li className="text-center py-4 text-sm text-slate-500">
                No upcoming renewals
              </li>
            ) : (
              renewalAlerts.map((alert) => (
                <li
                  key={alert.lease}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{alert.lease}</p>
                      <p className="text-xs text-slate-500">{alert.tenant}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <ArrowUpRight size={14} />
                      {alert.renewalDate}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{alert.action}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-9 w-9 rounded-full bg-emerald-100 p-2 text-emerald-600" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Cash flow tracker
                </h3>
                <p className="text-xs text-slate-500">
                  Major inflows and outflows for the current week.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {cashFlowEvents.length === 0 ? (
                <li className="text-center py-4 text-sm text-slate-500">
                  No recent cash flow events
                </li>
              ) : (
                cashFlowEvents.map((event) => (
                  <li
                    key={`${event.date}-${event.label}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {event.date}
                      </p>
                      <span className={eventTone(event.tone)}>{event.amount}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {event.label}
                    </p>
                    <p className="text-xs text-slate-500">{event.detail}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, change, icon, tone = "default" }) {
  // Map icon string to component
  const iconMap = {
    Banknote: Banknote,
    Clock4: Clock4,
    PieChart: PieChart,
  };
  const IconComponent = iconMap[icon] || Banknote;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${summaryTone(
        tone,
      )}`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-white/70 p-2 text-primary shadow-sm">
          <IconComponent size={18} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{change}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    paid: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-600",
      icon: CheckCircle2,
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-100 text-red-600",
      icon: AlertTriangle,
    },
    partial: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
      icon: CircleDollarSign,
    },
    dispute: {
      label: "In dispute",
      className: "bg-slate-200 text-slate-700",
      icon: FileText,
    },
    default: {
      label: "Pending",
      className: "bg-primary/10 text-primary",
      icon: Receipt,
    },
  };

  const tone = config[status] ?? config.default;
  const Icon = tone.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      <Icon size={12} />
      {tone.label}
    </span>
  );
}

function eventTone(tone) {
  const mapping = {
    incoming:
      "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600",
    outgoing:
      "inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600",
  };

  return mapping[tone] ?? mapping.incoming;
}

function summaryTone(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}

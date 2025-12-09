"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  Clock4,
  Download,
  FileText,
  PieChart,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/utils/api-config";
import html2pdf from "html2pdf.js";

export default function FinancialSummaryReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

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

  const handleExportPDF = () => {
    const element = document.getElementById("report-content");
    if (!element) return;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `financial-summary-${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const csvRows = [];
    csvRows.push("Financial Summary Report");
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push("");

    // Summary Cards
    csvRows.push("Summary Cards");
    csvRows.push("Title,Value,Change");
    data.summary_cards?.forEach((card) => {
      csvRows.push(`"${card.title}","${card.value}","${card.change}"`);
    });
    csvRows.push("");

    // Ageing Buckets
    csvRows.push("Ageing Buckets");
    csvRows.push("Label,Amount,Leases");
    data.ageing_buckets?.forEach((bucket) => {
      csvRows.push(`"${bucket.label}","${bucket.amount}",${bucket.leases}`);
    });
    csvRows.push("");

    // Rent Invoices
    csvRows.push("Rent Invoices Pipeline");
    csvRows.push("Invoice,Tenant/Unit,Due Date,Amount,Balance,Channel,Status");
    data.rent_invoices?.forEach((invoice) => {
      csvRows.push(
        `"${invoice.invoice}","${invoice.tenant}","${invoice.due}","${invoice.amount}","${invoice.balance}","${invoice.channel}","${invoice.status}"`
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `financial-summary-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading financial summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-600">Error loading financial summary: {error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summaryCards = data.summary_cards || [];
  const rentInvoices = data.rent_invoices || [];
  const ageingBuckets = data.ageing_buckets || [];
  const renewalAlerts = data.renewal_alerts || [];
  const cashFlowEvents = data.cash_flow_events || [];
  const expensePlan = data.expense_plan || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/reports"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Financial Reports
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <TrendingUp size={24} className="text-primary" />
              Financial Summary Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Comprehensive financial overview with income, expenses, cash flow, and
              ageing analysis. Export to PDF or CSV for detailed analysis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Calendar size={16} />
            Date Range
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>
      </header>

      {showDateFilter && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter by Date Range</h3>
            <button
              onClick={() => setShowDateFilter(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div id="report-content" className="space-y-6">
        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </section>

        {/* Charts Section */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Ageing Buckets Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <Clock4 className="h-9 w-9 rounded-full bg-amber-100 p-2 text-amber-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Ageing Analysis
                </h2>
                <p className="text-xs text-slate-500">
                  Outstanding invoices by age buckets
                </p>
              </div>
            </div>
            <AgeingChart buckets={ageingBuckets} />
          </div>

          {/* Expense Plan Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <PieChart className="h-9 w-9 rounded-full bg-blue-100 p-2 text-blue-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Expense Plan
                </h2>
                <p className="text-xs text-slate-500">
                  Budget allocation vs spending
                </p>
              </div>
            </div>
            <ExpensePlanChart expenses={expensePlan} />
          </div>
        </section>

        {/* Cash Flow Trend */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <TrendingUp className="h-9 w-9 rounded-full bg-emerald-100 p-2 text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Cash Flow Events (Last 30 Days)
              </h2>
              <p className="text-xs text-slate-500">
                Recent income and expense transactions
              </p>
            </div>
          </div>
          <CashFlowChart events={cashFlowEvents} />
        </section>

        {/* Rent Invoices Pipeline */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Rent Collection Pipeline
              </h2>
              <p className="text-xs text-slate-500">
                Invoices synced from accounting · auto-reconciled every 15 minutes.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <FileText size={14} />
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
        </section>

        {/* Renewal Alerts */}
        {renewalAlerts.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <Calendar className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Upcoming Renewals
                </h2>
                <p className="text-xs text-slate-500">
                  Automatic reminders issue 45 days before renewal.
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {renewalAlerts.map((alert, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{alert.lease}</p>
                      <p className="text-xs text-slate-500">{alert.tenant}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {alert.renewalDate}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{alert.action}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, icon, tone = "default" }) {
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

function AgeingChart({ buckets }) {
  const maxAmount = Math.max(
    ...buckets.map((b) => parseFloat(b.amount.replace(/[^\d.]/g, "")) || 0),
    1
  );

  return (
    <div className="space-y-4">
      {buckets.map((bucket, index) => {
        const amount = parseFloat(bucket.amount.replace(/[^\d.]/g, "")) || 0;
        const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{bucket.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">{bucket.amount}</span>
                <span className="text-slate-500">({bucket.leases} leases)</span>
              </div>
            </div>
            <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getToneColor(
                  bucket.tone,
                )}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExpensePlanChart({ expenses }) {
  return (
    <div className="space-y-4">
      {expenses.map((expense, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">{expense.category}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{expense.allocated}</span>
              <span className="text-slate-500">{expense.spentPercent}%</span>
            </div>
          </div>
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getToneColor(
                expense.tone,
              )}`}
              style={{ width: `${Math.min(100, expense.spentPercent)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CashFlowChart({ events }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No recent cash flow events
      </div>
    );
  }

  const maxAmount = Math.max(
    ...events.map((e) => Math.abs(parseFloat(e.amount.replace(/[^\d.-]/g, "")) || 0)),
    1
  );

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const amount = Math.abs(parseFloat(event.amount.replace(/[^\d.-]/g, "")) || 0);
        const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
        const isIncome = event.tone === "incoming";

        return (
          <div key={index} className="flex items-center gap-4">
            <div className="w-20 text-xs font-semibold text-slate-600">
              {event.date}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-900">
                  {event.label}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isIncome ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {event.amount}
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isIncome ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{event.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    paid: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-600",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-100 text-red-600",
    },
    partial: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
    },
    default: {
      label: "Pending",
      className: "bg-primary/10 text-primary",
    },
  };

  const tone = config[status] ?? config.default;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      {tone.label}
    </span>
  );
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

function getToneColor(tone) {
  const mapping = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    primary: "bg-primary",
    muted: "bg-slate-400",
  };

  return mapping[tone] ?? mapping.primary;
}

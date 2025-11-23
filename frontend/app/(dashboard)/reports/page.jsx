"use client";

import Link from "next/link";
import {
  BarChart,
  ArrowRight,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  Download,
} from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      id: "unified-payments",
      title: "Unified Payments Report",
      description:
        "View all incoming and outgoing payments across rent, expenses, and refunds in a single ledger view.",
      href: "/unified-payments",
      icon: DollarSign,
      color: "emerald",
      features: [
        "Filter by payment type, flow direction, and status",
        "Date range filtering",
        "Search by tenant, vendor, or reference",
        "Real-time payment tracking",
      ],
    },
    {
      id: "financial-summary",
      title: "Financial Summary",
      description:
        "Comprehensive financial overview with income, expenses, and net cash flow analysis.",
      href: "#",
      icon: TrendingUp,
      color: "blue",
      features: [
        "Income vs expenses breakdown",
        "Monthly and yearly trends",
        "Property-wise financial analysis",
        "Export to PDF/CSV",
      ],
      comingSoon: true,
    },
    {
      id: "occupancy-report",
      title: "Occupancy Report",
      description:
        "Track unit occupancy rates, lease expirations, and tenant turnover across properties.",
      href: "#",
      icon: Calendar,
      color: "purple",
      features: [
        "Occupancy rate by property",
        "Lease expiration calendar",
        "Tenant turnover analysis",
        "Vacancy trends",
      ],
      comingSoon: true,
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      emerald: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        icon: "text-emerald-600",
        button: "bg-emerald-600 hover:bg-emerald-700",
      },
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: "text-blue-600",
        button: "bg-blue-600 hover:bg-blue-700",
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        icon: "text-purple-600",
        button: "bg-purple-600 hover:bg-purple-700",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <BarChart size={28} className="text-primary" />
          Reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Access comprehensive reports and analytics for your rental property
          portfolio. View financial summaries, payment tracking, occupancy
          rates, and more.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const colors = getColorClasses(report.color);
          const Icon = report.icon;
          const isComingSoon = report.comingSoon;

          return (
            <div
              key={report.id}
              className={`group relative overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                isComingSoon ? "opacity-75" : ""
              }`}
            >
              {isComingSoon && (
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Coming Soon
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white ${colors.icon} shadow-sm`}
                >
                  <Icon size={24} />
                </div>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-slate-900">
                {report.title}
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                {report.description}
              </p>

              <ul className="mb-6 space-y-2">
                {report.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isComingSoon ? (
                <div
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg ${colors.button} px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed`}
                >
                  <FileText size={16} />
                  Coming Soon
                </div>
              ) : (
                <Link
                  href={report.href}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg ${colors.button} px-4 py-2.5 text-sm font-semibold text-white transition shadow-sm hover:shadow-md`}
                >
                  <span>View Report</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Download size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              Export Reports
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Most reports can be exported to PDF or CSV format for offline
              analysis, sharing with stakeholders, or record-keeping purposes.
              Look for the export button within each report.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">
              Filtering & Search
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              All reports support advanced filtering by date range, property,
              unit, tenant, and other relevant criteria. Use the search and
              filter options within each report to find exactly what you need.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


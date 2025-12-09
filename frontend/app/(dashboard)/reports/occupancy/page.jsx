"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Home,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/utils/api-config";
import html2pdf from "html2pdf.js";

export default function OccupancyReportPage() {
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

      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      const response = await fetch(`${API_BASE_URL}/occupancy-report?${params}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch occupancy data: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching occupancy data:", err);
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
      filename: `occupancy-report-${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const csvRows = [];
    csvRows.push("Occupancy Report");
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push("");

    // Overall Metrics
    csvRows.push("Overall Metrics");
    csvRows.push("Metric,Value");
    csvRows.push(`Total Units,${data.overall_metrics?.total_units || 0}`);
    csvRows.push(`Occupied Units,${data.overall_metrics?.occupied_units || 0}`);
    csvRows.push(`Vacant Units,${data.overall_metrics?.vacant_units || 0}`);
    csvRows.push(`Occupancy Rate,${data.overall_metrics?.occupancy_rate || 0}%`);
    csvRows.push(`Expiring in 30 Days,${data.overall_metrics?.expiring_30_days || 0}`);
    csvRows.push(`Expiring in 90 Days,${data.overall_metrics?.expiring_90_days || 0}`);
    csvRows.push("");

    // Occupancy by Property
    csvRows.push("Occupancy by Property");
    csvRows.push("Property,Total Units,Occupied Units,Vacant Units,Occupancy Rate");
    data.occupancy_by_property?.forEach((prop) => {
      csvRows.push(
        `"${prop.property_name}",${prop.total_units},${prop.occupied_units},${prop.vacant_units},${prop.occupancy_rate}%`
      );
    });
    csvRows.push("");

    // Lease Expirations
    csvRows.push("Lease Expirations");
    csvRows.push("Property,Unit,Tenant,Lease End Date,Days Until Expiry,Monthly Rent,Status");
    data.lease_expirations?.forEach((lease) => {
      csvRows.push(
        `"${lease.property_name}","${lease.unit_number}","${lease.tenant_name}","${lease.lease_end}",${lease.days_until_expiry},"${lease.monthly_rent}","${lease.status}"`
      );
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `occupancy-report-${new Date().toISOString().split("T")[0]}.csv`
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
          <p className="text-sm text-slate-600">Loading occupancy report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-600">Error loading occupancy report: {error}</p>
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

  const overallMetrics = data.overall_metrics || {};
  const occupancyByProperty = data.occupancy_by_property || [];
  const leaseExpirations = data.lease_expirations || [];
  const tenantTurnover = data.tenant_turnover || {};
  const vacancyTrends = data.vacancy_trends || [];
  const recentActivity = data.recent_activity || [];

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
              Occupancy Reports
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Home size={24} className="text-primary" />
              Occupancy Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track unit occupancy rates, lease expirations, tenant turnover, and vacancy
              trends across your properties. Export to PDF or CSV for detailed analysis.
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
        {/* Overall Metrics Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Units"
            value={overallMetrics.total_units || 0}
            icon={Home}
            tone="default"
          />
          <MetricCard
            title="Occupied Units"
            value={overallMetrics.occupied_units || 0}
            icon={Users}
            tone="success"
            subtitle={`${overallMetrics.occupancy_rate || 0}% occupancy rate`}
          />
          <MetricCard
            title="Vacant Units"
            value={overallMetrics.vacant_units || 0}
            icon={Home}
            tone="warning"
          />
          <MetricCard
            title="Expiring Soon"
            value={overallMetrics.expiring_30_days || 0}
            icon={Calendar}
            tone="danger"
            subtitle={`${overallMetrics.expiring_90_days || 0} in next 90 days`}
          />
        </section>

        {/* Tenant Turnover */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <TrendingUp className="h-9 w-9 rounded-full bg-blue-100 p-2 text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tenant Turnover Analysis
              </h2>
              <p className="text-xs text-slate-500">
                Move-ins and move-outs for the selected period
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Move-ins
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {tenantTurnover.move_ins || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Move-outs
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-600">
                {tenantTurnover.move_outs || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Net Change
              </p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  (tenantTurnover.net_change || 0) >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {(tenantTurnover.net_change || 0) >= 0 ? "+" : ""}
                {tenantTurnover.net_change || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Avg Lease Duration
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {tenantTurnover.average_lease_duration_days
                  ? `${Math.round(tenantTurnover.average_lease_duration_days / 30)} months`
                  : "N/A"}
              </p>
            </div>
          </div>
        </section>

        {/* Occupancy by Property */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Occupancy by Property
              </h2>
              <p className="text-xs text-slate-500">
                Current occupancy rates across all properties
              </p>
            </div>
          </header>

          {occupancyByProperty.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No properties found
            </div>
          ) : (
            <div className="space-y-4">
              {occupancyByProperty.map((property) => (
                <PropertyOccupancyCard key={property.property_id} property={property} />
              ))}
            </div>
          )}
        </section>

        {/* Vacancy Trends Chart */}
        {vacancyTrends.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <TrendingDown className="h-9 w-9 rounded-full bg-purple-100 p-2 text-purple-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Vacancy Trends
                </h2>
                <p className="text-xs text-slate-500">
                  Monthly occupancy rate over time
                </p>
              </div>
            </div>
            <VacancyTrendsChart trends={vacancyTrends} />
          </section>
        )}

        {/* Lease Expirations */}
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Lease Expirations
              </h2>
              <p className="text-xs text-slate-500">
                Leases expiring within the selected date range
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Calendar size={14} />
              {leaseExpirations.length} leases
            </span>
          </header>

          {leaseExpirations.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No leases expiring in the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] table-auto border-collapse text-sm text-slate-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Property / Unit</th>
                    <th className="px-3 py-2 font-semibold">Tenant</th>
                    <th className="px-3 py-2 font-semibold">Lease End</th>
                    <th className="px-3 py-2 font-semibold">Days Until</th>
                    <th className="px-3 py-2 font-semibold">Monthly Rent</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaseExpirations.map((lease) => (
                    <tr key={lease.tenant_unit_id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {lease.property_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            Unit {lease.unit_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-900">
                        {lease.tenant_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {lease.lease_end_formatted}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            lease.days_until_expiry < 0
                              ? "text-red-600"
                              : lease.days_until_expiry <= 30
                              ? "text-amber-600"
                              : "text-slate-600"
                          }`}
                        >
                          {lease.days_until_expiry < 0
                            ? `${Math.abs(lease.days_until_expiry)} days overdue`
                            : `${lease.days_until_expiry} days`}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        MVR {lease.monthly_rent}
                      </td>
                      <td className="px-3 py-3">
                        <LeaseStatusBadge status={lease.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Activity (Last 30 Days)
                </h2>
                <p className="text-xs text-slate-500">
                  Recent move-ins and move-outs
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          activity.action === "move_in"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {activity.action === "move_in" ? "Move-in" : "Move-out"}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {activity.property_name} · Unit {activity.unit_number}
                        </p>
                        <p className="text-xs text-slate-500">{activity.tenant_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-600">
                        {activity.action_date_formatted}
                      </p>
                      {activity.rent_amount && (
                        <p className="text-xs text-slate-500">
                          MVR {activity.rent_amount}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, tone = "default", subtitle }) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${getToneBg(
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
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs font-medium text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function PropertyOccupancyCard({ property }) {
  const occupancyRate = property.occupancy_rate || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{property.property_name}</h3>
          {property.address && (
            <p className="text-xs text-slate-500">{property.address}</p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            occupancyRate >= 90
              ? "bg-emerald-100 text-emerald-600"
              : occupancyRate >= 70
              ? "bg-amber-100 text-amber-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {occupancyRate}% Occupied
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Occupied</span>
          <span className="font-semibold text-slate-900">
            {property.occupied_units} / {property.total_units}
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              occupancyRate >= 90
                ? "bg-emerald-500"
                : occupancyRate >= 70
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Vacant: {property.vacant_units}</span>
        </div>
      </div>
    </div>
  );
}

function VacancyTrendsChart({ trends }) {
  const maxRate = Math.max(...trends.map((t) => t.occupancy_rate || 0), 100);

  return (
    <div className="space-y-4">
      {trends.map((trend, index) => {
        const occupancyRate = trend.occupancy_rate || 0;
        const percentage = maxRate > 0 ? (occupancyRate / maxRate) * 100 : 0;

        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{trend.month_label}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  {trend.occupied_units} / {trend.total_units}
                </span>
                <span className="font-semibold text-slate-900">
                  {occupancyRate}%
                </span>
              </div>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaseStatusBadge({ status }) {
  const config = {
    expired: {
      label: "Expired",
      className: "bg-red-100 text-red-600",
    },
    expiring_soon: {
      label: "Expiring Soon",
      className: "bg-amber-100 text-amber-600",
    },
    upcoming: {
      label: "Upcoming",
      className: "bg-blue-100 text-blue-600",
    },
    default: {
      label: "Active",
      className: "bg-emerald-100 text-emerald-600",
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

function getToneBg(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}

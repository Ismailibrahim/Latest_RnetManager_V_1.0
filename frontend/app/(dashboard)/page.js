"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Home as HomeIcon,
  Users,
  Wallet,
  Calendar,
  Wrench,
  Loader2,
} from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { API_BASE_URL } from "@/utils/api-config";

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tenantUnits, setTenantUnits] = useState([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [rentInvoices, setRentInvoices] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controllers = [];

    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view dashboard data.");
        }

        // Fetch all data in parallel
        const [
          propertiesRes,
          tenantsRes,
          tenantUnitsRes,
          financialRecordsRes,
          rentInvoicesRes,
          maintenanceRequestsRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/properties`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/tenants`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/tenant-units?per_page=200&status=active`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/financial-records?per_page=200`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/rent-invoices?per_page=200`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/maintenance-requests?per_page=10&include=unit,unit.property`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!isMounted) return;

        // Process properties
        if (propertiesRes.status === "fulfilled" && propertiesRes.value.ok) {
          const data = await propertiesRes.value.json();
          setProperties(Array.isArray(data?.data) ? data.data : []);
        }

        // Process tenants
        if (tenantsRes.status === "fulfilled" && tenantsRes.value.ok) {
          const data = await tenantsRes.value.json();
          setTenants(Array.isArray(data?.data) ? data.data : []);
        }

        // Process tenant units
        if (tenantUnitsRes.status === "fulfilled" && tenantUnitsRes.value.ok) {
          const data = await tenantUnitsRes.value.json();
          setTenantUnits(Array.isArray(data?.data) ? data.data : []);
        }

        // Process financial records
        if (financialRecordsRes.status === "fulfilled" && financialRecordsRes.value.ok) {
          const data = await financialRecordsRes.value.json();
          setFinancialRecords(Array.isArray(data?.data) ? data.data : []);
        }

        // Process rent invoices
        if (rentInvoicesRes.status === "fulfilled" && rentInvoicesRes.value.ok) {
          const data = await rentInvoicesRes.value.json();
          setRentInvoices(Array.isArray(data?.data) ? data.data : []);
        }

        // Process maintenance requests
        if (maintenanceRequestsRes.status === "fulfilled" && maintenanceRequestsRes.value.ok) {
          const data = await maintenanceRequestsRes.value.json();
          setMaintenanceRequests(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
      controllers.forEach((c) => c.abort());
    };
  }, []);

  const stats = useMemo(() => {
    // Calculate active properties
    const activeProperties = properties.filter((p) => p.status !== "deleted" || !p.status);
    const propertiesByLocation = activeProperties.reduce((acc, prop) => {
      const location = prop.address?.toLowerCase() || "";
      if (location.includes("malé") || location.includes("male")) {
        acc.male += 1;
      } else if (location.includes("addu")) {
        acc.addu += 1;
      }
      return acc;
    }, { male: 0, addu: 0 });

    // Calculate active tenants
    const activeTenants = tenants.filter((t) => t.status === "active");

    // Calculate rent collected (from financial records with type 'rent' or 'income')
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const rentCollected = financialRecords
      .filter((record) => {
        const recordDate = new Date(record.date || record.created_at);
        return (
          recordDate >= currentMonth &&
          (record.type === "rent" ||
            record.type === "income" ||
            record.category?.toLowerCase().includes("rent"))
        );
      })
      .reduce((sum, record) => {
        const amount = Number(record.amount) || 0;
        return sum + (record.transaction_type === "credit" ? amount : -amount);
      }, 0);

    // Calculate upcoming renewals (leases ending in next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingRenewals = tenantUnits.filter((tu) => {
      if (!tu.lease_end) return false;
      const endDate = new Date(tu.lease_end);
      return endDate >= now && endDate <= thirtyDaysFromNow;
    }).length;

    // Calculate occupancy rate
    const totalUnits = properties.reduce((sum, p) => sum + (p.units_count || 0), 0);
    const occupiedUnits = tenantUnits.length;
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Calculate invoices due this week
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const invoicesDue = rentInvoices.filter((inv) => {
      if (!inv.due_date || inv.status === "paid") return false;
      const dueDate = new Date(inv.due_date);
      return dueDate >= now && dueDate <= oneWeekFromNow;
    }).length;

    // Calculate outstanding rent
    const outstandingRent = rentInvoices
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => {
        const amount = Number(inv.total_amount || inv.amount || 0);
        const paid = Number(inv.amount_paid || 0);
        return sum + (amount - paid);
      }, 0);

    // Calculate security deposits held
    const depositsHeld = tenantUnits.reduce((sum, tu) => {
      return sum + (Number(tu.security_deposit_paid) || 0);
    }, 0);

    // USD conversion (approximate, using 1 USD = 15.4 MVR)
    const usdRate = 15.4;
    const rentCollectedUSD = rentCollected / usdRate;
    const outstandingUSD = outstandingRent / usdRate;

    return {
      activeProperties: activeProperties.length,
      propertiesByLocation,
      activeTenants: activeTenants.length,
      rentCollected,
      rentCollectedUSD,
      upcomingRenewals,
      occupancyRate,
      invoicesDue,
      outstandingRent,
      outstandingUSD,
      depositsHeld,
    };
  }, [properties, tenants, tenantUnits, financialRecords, rentInvoices]);

  // Get top maintenance requests for display (filter out completed/closed)
  const topMaintenanceRequests = useMemo(() => {
    const activeRequests = maintenanceRequests.filter(
      (req) =>
        req.status &&
        !["completed", "closed", "cancelled"].includes(req.status.toLowerCase())
    );

    return activeRequests
      .slice(0, 3)
      .map((req) => {
        const unitName = req.unit?.unit_number || req.unit_id ? `Unit ${req.unit_id}` : "";
        const propertyName =
          req.unit?.property?.name || req.property_name || "Property";
        const title = req.title || req.description || "Maintenance request";
        const status = req.status || "Open";

        // Format status for display
        const statusDisplay = status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        const displayTitle = unitName
          ? `${title} - ${propertyName} ${unitName}`
          : `${title} - ${propertyName}`;

        return {
          id: req.id,
          title: displayTitle,
          meta: req.notes || req.description || "No additional details",
          status: statusDisplay,
        };
      });
  }, [maintenanceRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  const locationSubtitle =
    stats.propertiesByLocation.male > 0 || stats.propertiesByLocation.addu > 0
      ? `${stats.propertiesByLocation.male} in Malé · ${stats.propertiesByLocation.addu} in Addu`
      : "Properties across portfolio";

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="badge">
            <TrendingUp size={14} />
            Real-time data
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Dashboard Overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track occupancy, revenue, and maintenance workstreams across the
            Maldives portfolio. Insights update in real-time as your team works.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            {stats.occupancyRate}% occupancy across live leases
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning" />
            {stats.invoicesDue} invoice{stats.invoicesDue !== 1 ? "s" : ""} due this week
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            {stats.outstandingRent > 0
              ? `${formatMVR(stats.outstandingRent)} outstanding`
              : "All invoices paid"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HomeIcon}
          title="Active Properties"
          value={stats.activeProperties.toString()}
          subtitle={locationSubtitle}
        />
        <StatCard
          icon={Users}
          title="Current Tenants"
          value={stats.activeTenants.toString()}
          subtitle={`${tenantUnits.length} active lease${tenantUnits.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          icon={Wallet}
          title="Rent Collected (MVR)"
          value={formatMVR(stats.rentCollected).replace("MVR ", "")}
          subtitle={`USD ${stats.rentCollectedUSD.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />
        <StatCard
          icon={Calendar}
          title="Upcoming Renewals"
          value={stats.upcomingRenewals.toString()}
          subtitle="Next 30 days"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Maintenance Queue
              </h3>
              <p className="text-xs text-slate-500">
                Prioritised by impact and SLA
              </p>
            </div>
            <Link
              href="/maintenance"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              View all
            </Link>
          </header>

          <ul className="space-y-3 text-sm text-slate-600">
            {topMaintenanceRequests.length > 0 ? (
              topMaintenanceRequests.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.meta}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.status}
                  </span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                No active maintenance requests
              </li>
            )}
          </ul>
        </div>

        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <Wrench className="h-9 w-9 rounded-full bg-primary/10 p-2 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Rent Collection Snapshot
              </h3>
              <p className="text-xs text-slate-500">
                Maldives Rufiyaa converted to US Dollar for reporting.
              </p>
            </div>
          </header>

          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Collected this month</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatMVR(stats.rentCollected)}
                </p>
              </div>
              <span className="badge">
                USD {stats.rentCollectedUSD.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="text-lg font-semibold text-warning">
                  {formatMVR(stats.outstandingRent)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {stats.invoicesDue} invoice{stats.invoicesDue !== 1 ? "s" : ""} due in 7 days
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Security deposits held</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatMVR(stats.depositsHeld)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {tenantUnits.length} active lease{tenantUnits.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon size={20} />
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}


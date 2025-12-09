"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarRange,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Users,
  Wallet,
  Shield,
  Banknote,
  RefreshCcw,
} from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency-formatter";
import { API_BASE_URL } from "@/utils/api-config";
import { EndLeaseSection } from "@/components/tenant-unit/EndLeaseSection";

const formatCurrency = formatMVR;

export default function TenantUnitDetailsPage({ params }) {
  const routeParams = use(params);
  const tenantUnitId = routeParams?.id;
  const router = useRouter();

  const [tenantUnit, setTenantUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rentInvoices, setRentInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const [financialRecords, setFinancialRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [occupancyHistory, setOccupancyHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [securityDepositRefunds, setSecurityDepositRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(true);

  // Fetch tenant unit details
  useEffect(() => {
    if (!tenantUnitId) {
      return;
    }

    const controller = new AbortController();

    async function fetchTenantUnit() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in to view lease details.");
        }

        const response = await fetch(
          `${API_BASE_URL}/tenant-units/${tenantUnitId}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 404) {
          throw new Error("We couldn't find that lease.");
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.message ||
              `Unable to load lease (HTTP ${response.status}).`
          );
        }

        const payload = await response.json();
        const data = payload?.data ?? null;
        setTenantUnit(data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTenantUnit();

    return () => controller.abort();
  }, [tenantUnitId, refreshKey]);

  // Fetch rent invoices
  useEffect(() => {
    if (!tenantUnitId) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    async function fetchInvoices() {
      if (!isMounted) return;
      
      setInvoicesLoading(true);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setRentInvoices([]);
            setInvoicesLoading(false);
          }
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/rent-invoices?tenant_unit_id=${tenantUnitId}&per_page=100`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch((fetchError) => {
          // Handle network errors (CORS, connection refused, etc.)
          if (isMounted) {
            console.warn("Network error fetching invoices:", fetchError.message);
            setRentInvoices([]);
            setInvoicesLoading(false);
          }
          return null;
        });

        if (!response || !isMounted) {
          return;
        }

        if (response.ok) {
          try {
            const payload = await response.json();
            if (isMounted) {
              setRentInvoices(Array.isArray(payload?.data) ? payload.data : []);
            }
          } catch (parseError) {
            console.warn("Failed to parse invoices response:", parseError);
            if (isMounted) {
              setRentInvoices([]);
            }
          }
        } else {
          // If API returns error, just set empty array instead of breaking
          console.warn("Failed to fetch invoices:", response.status);
          if (isMounted) {
            setRentInvoices([]);
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        // Network errors or other fetch errors - set empty array to prevent breaking
        console.warn("Error fetching invoices:", err.message || err);
        if (isMounted) {
          setRentInvoices([]);
        }
      } finally {
        if (isMounted) {
          setInvoicesLoading(false);
        }
      }
    }

    fetchInvoices();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnitId, refreshKey]);

  // Fetch financial records
  useEffect(() => {
    if (!tenantUnitId) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    async function fetchFinancialRecords() {
      if (!isMounted) return;
      
      setRecordsLoading(true);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setFinancialRecords([]);
            setRecordsLoading(false);
          }
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/financial-records?tenant_unit_id=${tenantUnitId}&per_page=100`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch((fetchError) => {
          if (isMounted) {
            console.warn("Network error fetching financial records:", fetchError.message);
            setFinancialRecords([]);
            setRecordsLoading(false);
          }
          return null;
        });

        if (!response || !isMounted) {
          return;
        }

        if (response.ok) {
          try {
            const payload = await response.json();
            if (isMounted) {
              setFinancialRecords(
                Array.isArray(payload?.data) ? payload.data : []
              );
            }
          } catch (parseError) {
            console.warn("Failed to parse financial records response:", parseError);
            if (isMounted) {
              setFinancialRecords([]);
            }
          }
        } else {
          console.warn("Failed to fetch financial records:", response.status);
          if (isMounted) {
            setFinancialRecords([]);
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("Error fetching financial records:", err.message || err);
        if (isMounted) {
          setFinancialRecords([]);
        }
      } finally {
        if (isMounted) {
          setRecordsLoading(false);
        }
      }
    }

    fetchFinancialRecords();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnitId, refreshKey]);

  // Fetch occupancy history
  useEffect(() => {
    if (!tenantUnitId) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    async function fetchOccupancyHistory() {
      if (!isMounted) return;
      
      setHistoryLoading(true);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setOccupancyHistory([]);
            setHistoryLoading(false);
          }
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/unit-occupancy-history?tenant_unit_id=${tenantUnitId}&per_page=100`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch((fetchError) => {
          if (isMounted) {
            console.warn("Network error fetching occupancy history:", fetchError.message);
            setOccupancyHistory([]);
            setHistoryLoading(false);
          }
          return null;
        });

        if (!response || !isMounted) {
          return;
        }

        if (response.ok) {
          try {
            const payload = await response.json();
            if (isMounted) {
              setOccupancyHistory(Array.isArray(payload?.data) ? payload.data : []);
            }
          } catch (parseError) {
            console.warn("Failed to parse occupancy history response:", parseError);
            if (isMounted) {
              setOccupancyHistory([]);
            }
          }
        } else {
          console.warn("Failed to fetch occupancy history:", response.status);
          if (isMounted) {
            setOccupancyHistory([]);
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("Error fetching occupancy history:", err.message || err);
        if (isMounted) {
          setOccupancyHistory([]);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    }

    fetchOccupancyHistory();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnitId, refreshKey]);

  // Fetch security deposit refunds
  useEffect(() => {
    if (!tenantUnitId) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    async function fetchRefunds() {
      if (!isMounted) return;
      
      setRefundsLoading(true);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          if (isMounted) {
            setSecurityDepositRefunds([]);
            setRefundsLoading(false);
          }
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/security-deposit-refunds?tenant_unit_id=${tenantUnitId}&per_page=100`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch((fetchError) => {
          if (isMounted) {
            console.warn("Network error fetching refunds:", fetchError.message);
            setSecurityDepositRefunds([]);
            setRefundsLoading(false);
          }
          return null;
        });

        if (!response || !isMounted) {
          return;
        }

        if (response.ok) {
          try {
            const payload = await response.json();
            if (isMounted) {
              setSecurityDepositRefunds(
                Array.isArray(payload?.data) ? payload.data : []
              );
            }
          } catch (parseError) {
            console.warn("Failed to parse refunds response:", parseError);
            if (isMounted) {
              setSecurityDepositRefunds([]);
            }
          }
        } else {
          console.warn("Failed to fetch refunds:", response.status);
          if (isMounted) {
            setSecurityDepositRefunds([]);
          }
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.warn("Error fetching refunds:", err.message || err);
        if (isMounted) {
          setSecurityDepositRefunds([]);
        }
      } finally {
        if (isMounted) {
          setRefundsLoading(false);
        }
      }
    }

    fetchRefunds();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnitId, refreshKey]);

  const handleLeaseEnded = () => {
    // Refresh all data
    setRefreshKey((value) => value + 1);
    // Optionally redirect after a delay
    setTimeout(() => {
      router.push("/tenant-units");
    }, 2000);
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-slate-500">Loading lease details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">
            We couldn't load the lease details
          </p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <RefreshCcw size={16} />
          Try again
        </button>
      </div>
    );
  }

  if (!tenantUnit) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
        <p className="text-sm text-slate-500">Lease not found.</p>
        <Link
          href="/tenant-units"
          className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          <ArrowLeft size={16} />
          Back to leases
        </Link>
      </div>
    );
  }

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id}`;
  const unitNumber =
    tenantUnit?.unit?.unit_number ?? `Unit #${tenantUnit?.unit_id}`;
  const propertyName = tenantUnit?.unit?.property?.name;
  const propertyId = tenantUnit?.unit?.property_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tenant-units"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back</span>
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Lease detail
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <FileText size={22} className="text-primary" />
              {tenantName} · {unitNumber}
            </h1>
            <p className="text-sm text-slate-500">
              {propertyName && (
                <>
                  <Building2 size={14} className="mr-1 inline" />
                  {propertyName}
                  {propertyId && (
                    <>
                      {" · "}
                      <Link
                        href={`/properties/${propertyId}`}
                        className="font-semibold text-primary transition hover:text-primary/80"
                      >
                        View property
                      </Link>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tenantUnit?.tenant_id && (
            <Link
              href={`/tenants/${tenantUnit.tenant_id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              <Users size={16} />
              View Tenant
            </Link>
          )}
          {tenantUnit?.unit_id && (
            <Link
              href={`/units/${tenantUnit.unit_id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              <Layers size={16} />
              View Unit
            </Link>
          )}
        </div>
      </header>

      {/* Lease Overview */}
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <FileText size={16} className="text-primary" />
          Lease Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="Lease Period"
            value={
              tenantUnit.lease_start && tenantUnit.lease_end
                ? `${new Date(tenantUnit.lease_start).toLocaleDateString()} → ${new Date(tenantUnit.lease_end).toLocaleDateString()}`
                : "N/A"
            }
            icon={<CalendarRange size={20} />}
          />
          <InfoCard
            label="Monthly Rent"
            value={(() => {
              // Use unit currency if tenant-unit currency is not set or is default MVR
              const tenantUnitCurrency = tenantUnit?.currency;
              const unitCurrency = tenantUnit?.unit?.currency;
              const currency = (tenantUnitCurrency && tenantUnitCurrency.toUpperCase() !== 'MVR') 
                ? tenantUnitCurrency 
                : (unitCurrency ?? tenantUnitCurrency ?? 'MVR');
              
              return formatCurrencyUtil(tenantUnit.monthly_rent || 0, currency);
            })()}
            icon={<Wallet size={20} />}
          />
          <InfoCard
            label="Security Deposit"
            value={(() => {
              // Use security_deposit_currency from API response, or fall back to unit's security_deposit_currency
              const securityDepositCurrency = tenantUnit?.security_deposit_currency 
                ?? tenantUnit?.unit?.security_deposit_currency
                ?? tenantUnit?.unit?.currency
                ?? tenantUnit?.currency
                ?? 'MVR';
              
              return formatCurrencyUtil(tenantUnit.security_deposit_paid || 0, securityDepositCurrency);
            })()}
            icon={<Shield size={20} />}
          />
          <InfoCard
            label="Status"
            value={
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                  tenantUnit.status === "active"
                    ? "bg-success/10 text-success"
                    : tenantUnit.status === "ended"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-danger/10 text-danger"
                }`}
              >
                {tenantUnit.status || "Unknown"}
              </span>
            }
            icon={<FileText size={20} />}
          />
        </div>

        {/* Advance Rent Info */}
        {tenantUnit.advance_rent_amount > 0 && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Banknote size={16} />
              Advance Rent Information
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-blue-700">Collected</p>
                <p className="mt-1 text-lg font-semibold text-blue-900">
                  {(() => {
                    const tenantUnitCurrency = tenantUnit?.currency;
                    const unitCurrency = tenantUnit?.unit?.currency;
                    const currency = (tenantUnitCurrency && tenantUnitCurrency.toUpperCase() !== 'MVR') 
                      ? tenantUnitCurrency 
                      : (unitCurrency ?? tenantUnitCurrency ?? 'MVR');
                    return formatCurrencyUtil(tenantUnit.advance_rent_amount, currency);
                  })()}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  {tenantUnit.advance_rent_months} month
                  {tenantUnit.advance_rent_months !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700">Used</p>
                <p className="mt-1 text-lg font-semibold text-blue-900">
                  {(() => {
                    const tenantUnitCurrency = tenantUnit?.currency;
                    const unitCurrency = tenantUnit?.unit?.currency;
                    const currency = (tenantUnitCurrency && tenantUnitCurrency.toUpperCase() !== 'MVR') 
                      ? tenantUnitCurrency 
                      : (unitCurrency ?? tenantUnitCurrency ?? 'MVR');
                    return formatCurrencyUtil(tenantUnit.advance_rent_used || 0, currency);
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700">Remaining</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">
                  {(() => {
                    const tenantUnitCurrency = tenantUnit?.currency;
                    const unitCurrency = tenantUnit?.unit?.currency;
                    const currency = (tenantUnitCurrency && tenantUnitCurrency.toUpperCase() !== 'MVR') 
                      ? tenantUnitCurrency 
                      : (unitCurrency ?? tenantUnitCurrency ?? 'MVR');
                    return formatCurrencyUtil(tenantUnit.advance_rent_remaining || 0, currency);
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Wallet size={16} className="text-primary" />
          Payment History
        </h2>
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : rentInvoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No rent invoices found for this lease.
          </p>
        ) : (
          <div className="space-y-2">
            {rentInvoices.slice(0, 10).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {invoice.invoice_number || `Invoice #${invoice.id}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {invoice.invoice_date
                      ? new Date(invoice.invoice_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {(() => {
                      // Use invoice currency if available, otherwise fall back to tenant-unit currency
                      const invoiceCurrency = invoice?.currency;
                      const tenantUnitCurrency = tenantUnit?.currency;
                      const unitCurrency = tenantUnit?.unit?.currency;
                      const currency = invoiceCurrency 
                        ? invoiceCurrency 
                        : ((tenantUnitCurrency && tenantUnitCurrency.toUpperCase() !== 'MVR') 
                          ? tenantUnitCurrency 
                          : (unitCurrency ?? tenantUnitCurrency ?? 'MVR'));
                      return formatCurrencyUtil(
                        (Number(invoice.rent_amount) || 0) + (Number(invoice.late_fee) || 0),
                        currency
                      );
                    })()}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      invoice.status === "paid"
                        ? "text-emerald-600"
                        : invoice.status === "overdue"
                          ? "text-red-600"
                          : "text-slate-500"
                    }`}
                  >
                    {invoice.status || "Unknown"}
                  </p>
                </div>
              </div>
            ))}
            {rentInvoices.length > 10 && (
              <p className="pt-2 text-center text-xs text-slate-500">
                Showing 10 of {rentInvoices.length} invoices
              </p>
            )}
          </div>
        )}
      </section>

      {/* Occupancy History */}
      {occupancyHistory.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <CalendarRange size={16} className="text-primary" />
            Occupancy History
          </h2>
          <div className="space-y-2">
            {occupancyHistory.map((history) => (
              <div
                key={history.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {history.action === "move_in" ? "Move In" : "Move Out"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {history.action_date
                      ? new Date(history.action_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                {history.notes && (
                  <p className="text-xs text-slate-500">{history.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* End Lease Section - Only show for active leases */}
      {tenantUnit.status === "active" && (
        <EndLeaseSection
          tenantUnit={tenantUnit}
          rentInvoices={rentInvoices}
          financialRecords={financialRecords}
          securityDepositRefunds={securityDepositRefunds}
          onLeaseEnded={handleLeaseEnded}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}


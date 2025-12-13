"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Receipt, ShieldX } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrency } from "@/lib/currency-formatter";
import { useAuth } from "@/contexts/AuthContext";
import UnitSelector from "@/components/tenant-payments/UnitSelector";
import InvoiceList from "@/components/tenant-payments/InvoiceList";
import PaymentForm from "@/components/tenant-payments/PaymentForm";

export default function TenantPaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState(null);
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Check if user should have access (not a landlord/admin)
  useEffect(() => {
    if (user) {
      // Block super admins, admins, and owners from accessing tenant payment page
      const restrictedRoles = ['super_admin', 'admin', 'owner', 'manager'];
      if (user.role && restrictedRoles.includes(user.role)) {
        setAccessDenied(true);
        setUnitsLoading(false);
        return;
      }
    }
  }, [user]);

  // Fetch tenant's units
  useEffect(() => {
    if (accessDenied) return;

    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnits() {
      setUnitsLoading(true);
      setUnitsError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view your units.");
        }

        const response = await fetch(`${API_BASE_URL}/tenant/units`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          
          // If 403, user is not authorized
          if (response.status === 403) {
            setAccessDenied(true);
            setUnitsError(payload?.message ?? "Access denied. This feature is only available to tenants.");
            return;
          }
          
          throw new Error(
            payload?.message ?? `Unable to load units (HTTP ${response.status}).`
          );
        }

        const payload = await response.json();
        if (!isMounted) return;

        setUnits(payload?.data ?? []);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!isMounted) return;
        setUnitsError(err.message);
      } finally {
        if (isMounted) {
          setUnitsLoading(false);
        }
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [accessDenied]);

  // Fetch invoices when unit is selected
  useEffect(() => {
    if (!selectedUnitId) {
      setInvoices([]);
      setSelectedInvoice(null);
      setShowPaymentForm(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchInvoices() {
      setInvoicesLoading(true);
      setInvoicesError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view invoices.");
        }

        const response = await fetch(
          `${API_BASE_URL}/tenant/units/${selectedUnitId}/invoices`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.message ?? `Unable to load invoices (HTTP ${response.status}).`
          );
        }

        const payload = await response.json();
        if (!isMounted) return;

        setInvoices(payload?.data ?? []);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!isMounted) return;
        setInvoicesError(err.message);
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
  }, [selectedUnitId]);

  const handleUnitSelect = (unitId) => {
    setSelectedUnitId(unitId);
    setSelectedInvoice(null);
    setShowPaymentForm(false);
    setSubmissionSuccess(false);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
    setSubmissionSuccess(false);
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to submit payment.");
      }

      const formData = new FormData();
      formData.append("tenant_unit_id", selectedUnitId);
      formData.append("rent_invoice_id", selectedInvoice.id);
      formData.append("payment_amount", paymentData.amount);
      formData.append("payment_date", paymentData.date);
      formData.append("payment_method", paymentData.method);
      if (paymentData.notes) {
        formData.append("notes", paymentData.notes);
      }
      if (paymentData.receipt) {
        formData.append("receipt", paymentData.receipt);
      }

      const response = await fetch(`${API_BASE_URL}/tenant/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to submit payment (HTTP ${response.status}).`
        );
      }

      setSubmissionSuccess(true);
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      
      // Refresh invoices to show updated status
      const invoicesResponse = await fetch(
        `${API_BASE_URL}/tenant/units/${selectedUnitId}/invoices`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (invoicesResponse.ok) {
        const invoicesPayload = await invoicesResponse.json();
        setInvoices(invoicesPayload?.data ?? []);
      }
    } catch (err) {
      alert(err.message ?? "Failed to submit payment. Please try again.");
    }
  };

  const selectedUnit = units.find((u) => u.id === parseInt(selectedUnitId));

  // Show access denied message
  if (accessDenied) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Access Restricted
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <ShieldX size={22} className="text-red-600" />
            Access Denied
          </h1>
        </header>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <ShieldX size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900">
                This page is only available to tenants
              </h2>
              <p className="mt-2 text-sm text-red-700">
                {unitsError || "You don't have permission to access the tenant payment feature. This feature is exclusively for tenants to submit their rent payments."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Submit your payment
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Receipt size={22} className="text-primary" />
          Tenant Payments
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Select your unit, choose an invoice, and submit your payment. Upload a receipt for bank deposits or transfers.
        </p>
      </header>

      {submissionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Payment submitted successfully!
              </p>
              <p className="text-xs text-emerald-700">
                Your payment is pending owner confirmation. You will be notified once it's confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Step 1: Select Your Unit</h2>
        
        {unitsLoading ? (
          <div className="flex items-center gap-2 py-8 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading your units...</span>
          </div>
        ) : unitsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{unitsError}</span>
            </div>
          </div>
        ) : (
          <UnitSelector
            units={units}
            selectedUnitId={selectedUnitId}
            onSelect={handleUnitSelect}
          />
        )}
      </section>

      {selectedUnitId && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Step 2: Choose an Invoice</h2>
          
          {invoicesLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              <span>Loading invoices...</span>
            </div>
          ) : invoicesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">{invoicesError}</span>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-600">
                No unpaid invoices found for this unit.
              </p>
            </div>
          ) : (
            <InvoiceList
              invoices={invoices}
              selectedInvoice={selectedInvoice}
              onSelect={handleInvoiceSelect}
              currency={selectedUnit?.currency ?? "MVR"}
            />
          )}
        </section>
      )}

      {showPaymentForm && selectedInvoice && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Step 3: Enter Payment Details</h2>
          
          <PaymentForm
            invoice={selectedInvoice}
            currency={selectedUnit?.currency ?? "MVR"}
            onSubmit={handlePaymentSubmit}
            onCancel={() => {
              setShowPaymentForm(false);
              setSelectedInvoice(null);
            }}
          />
        </section>
      )}
    </div>
  );
}


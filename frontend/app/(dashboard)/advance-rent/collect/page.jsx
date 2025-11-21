"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Wallet,
  Building2,
  CalendarRange,
  Users,
} from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { API_BASE_URL } from "@/utils/api-config";

const initialFormState = {
  tenantUnitId: "",
  advanceRentMonths: "",
  advanceRentAmount: "",
  paymentMethod: "",
  transactionDate: "",
  referenceNumber: "",
  notes: "",
};

function CollectAdvanceRentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(() => ({ ...initialFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [amountManuallyEdited, setAmountManuallyEdited] = useState(false);

  const [tenantUnits, setTenantUnits] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  const {
    options: paymentMethodOptions,
    loading: paymentMethodsLoading,
    error: paymentMethodsError,
  } = usePaymentMethods();

  useEffect(() => {
    const tenantUnitParam =
      searchParams.get("tenantUnitId") ??
      searchParams.get("tenant_unit_id") ??
      searchParams.get("tenantUnit");

    if (tenantUnitParam) {
      setForm((previous) => ({
        ...previous,
        tenantUnitId: String(tenantUnitParam),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadTenantUnits() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in to load tenant units.");
        }

        const response = await fetch(`${API_BASE_URL}/tenant-units?per_page=100&status=active`, {
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
        const items = Array.isArray(payload?.data) ? payload.data : [];

        if (!isMounted) {
          return;
        }

        setTenantUnits(
          [...items].sort((a, b) => {
            const labelA = buildTenantUnitLabel(a);
            const labelB = buildTenantUnitLabel(b);
            return labelA.localeCompare(labelB);
          })
        );
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setOptionsError(error.message);
          setTenantUnits([]);
        }
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    }

    loadTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const tenantUnitOptions = useMemo(() => {
    return tenantUnits.map((tu) => ({
      value: String(tu.id),
      label: buildTenantUnitLabel(tu),
    }));
  }, [tenantUnits]);

  const selectedTenantUnit = useMemo(() => {
    if (!form.tenantUnitId) {
      return null;
    }
    return tenantUnits.find((tu) => String(tu.id) === form.tenantUnitId) ?? null;
  }, [tenantUnits, form.tenantUnitId]);

  useEffect(() => {
    if (amountManuallyEdited || !selectedTenantUnit) {
      return;
    }

    setForm((previous) => {
      const monthsValue = Number(previous.advanceRentMonths);

      if (!Number.isFinite(monthsValue) || monthsValue <= 0) {
        if (previous.advanceRentAmount === "") {
          return previous;
        }
        return {
          ...previous,
          advanceRentAmount: "",
        };
      }

      const monthlyRent = Number(selectedTenantUnit.monthly_rent);

      if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
        if (previous.advanceRentAmount === "") {
          return previous;
        }
        return {
          ...previous,
          advanceRentAmount: "",
        };
      }

      const computed = monthlyRent * monthsValue;
      const nextValue = String(computed);

      if (previous.advanceRentAmount === nextValue) {
        return previous;
      }

      return {
        ...previous,
        advanceRentAmount: nextValue,
      };
    });
  }, [selectedTenantUnit, form.advanceRentMonths, amountManuallyEdited]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "advanceRentMonths") {
      setAmountManuallyEdited(false);
    } else if (name === "advanceRentAmount") {
      setAmountManuallyEdited(true);
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setValidationErrors((previous) => {
      if (!previous || Object.keys(previous).length === 0) {
        return previous;
      }

      const next = { ...previous };
      delete next[nameToApiKey(name)];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before collecting advance rent.");
      }

      if (!form.tenantUnitId) {
        throw new Error("Please select a tenant unit.");
      }

      const payload = {
        advance_rent_months: Number(form.advanceRentMonths),
        advance_rent_amount: Number(form.advanceRentAmount),
        payment_method: form.paymentMethod || null,
        transaction_date: form.transactionDate || new Date().toISOString().split("T")[0],
        reference_number: form.referenceNumber || null,
        notes: form.notes || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/tenant-units/${form.tenantUnitId}/advance-rent`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 422) {
        const validationPayload = await response.json();
        setValidationErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to collect advance rent (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setSuccess(true);
      setForm(() => ({ ...initialFormState }));

      setTimeout(() => {
        router.push(`/tenant-units/${form.tenantUnitId}`);
        router.refresh();
      }, 1500);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit = submitting || optionsLoading || paymentMethodsLoading;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/tenant-units"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wallet size={24} className="text-primary" />
            Collect Advance Rent
          </h1>
          <p className="text-sm text-slate-600">
            Record advance rent collection for a tenant unit. This will create a financial record
            and update the lease. Invoices generated within the advance rent period will be
            automatically paid.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {optionsError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">We couldn&apos;t load tenant units.</p>
              <p className="mt-1 text-xs text-amber-700">{optionsError}</p>
            </div>
          </div>
        ) : null}

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>
              Advance rent collected successfully. Redirecting to tenant unit details…
            </p>
          </div>
        ) : null}

        {selectedTenantUnit ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Lease Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-slate-500">Tenant</span>
                <p className="text-sm font-medium text-slate-900">
                  {selectedTenantUnit.tenant?.full_name ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Unit</span>
                <p className="text-sm font-medium text-slate-900">
                  {selectedTenantUnit.unit?.unit_number ?? "N/A"}
                  {selectedTenantUnit.unit?.property?.name
                    ? ` • ${selectedTenantUnit.unit.property.name}`
                    : ""}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Monthly Rent</span>
                <p className="text-sm font-medium text-slate-900">
                  {formatMVR(selectedTenantUnit.monthly_rent)}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Lease Period</span>
                <p className="text-sm font-medium text-slate-900">
                  {selectedTenantUnit.lease_start
                    ? new Date(selectedTenantUnit.lease_start).toLocaleDateString()
                    : "N/A"}{" "}
                  to{" "}
                  {selectedTenantUnit.lease_end
                    ? new Date(selectedTenantUnit.lease_end).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              {selectedTenantUnit.advance_rent_amount > 0 ? (
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500">Current Advance Rent</span>
                  <p className="text-sm font-medium text-slate-900">
                    {formatMVR(selectedTenantUnit.advance_rent_amount)} (
                    {selectedTenantUnit.advance_rent_months} month
                    {selectedTenantUnit.advance_rent_months !== 1 ? "s" : ""})
                    {selectedTenantUnit.advance_rent_remaining > 0 ? (
                      <span className="ml-2 text-xs text-slate-600">
                        ({formatMVR(selectedTenantUnit.advance_rent_remaining)} remaining)
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    Note: Collecting new advance rent will replace the existing amount.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Fieldset>
            <Label htmlFor="tenantUnitId">Tenant Unit *</Label>
            <select
              id="tenantUnitId"
              name="tenantUnitId"
              value={form.tenantUnitId}
              onChange={handleChange}
              disabled={disableSubmit || tenantUnitOptions.length === 0}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.tenant_unit_id ? "tenantUnitId-error" : undefined
              }
            >
              <option value="" disabled>
                Select tenant unit
              </option>
              {tenantUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Hint icon={<Users size={14} className="text-slate-400" />}>
              Select the active lease to collect advance rent for.
            </Hint>
            {validationErrors.tenant_unit_id ? (
              <FieldError id="tenantUnitId-error">
                {firstError(validationErrors.tenant_unit_id)}
              </FieldError>
            ) : null}
          </Fieldset>

          <div className="grid gap-5 md:grid-cols-2">
            <Fieldset>
              <Label htmlFor="advanceRentMonths">Advance Rent (Months) *</Label>
              <Input
                id="advanceRentMonths"
                name="advanceRentMonths"
                type="number"
                min="1"
                max="12"
                step="1"
                placeholder="1"
                value={form.advanceRentMonths}
                onChange={handleChange}
                disabled={disableSubmit || !selectedTenantUnit}
                required
                aria-describedby={
                  validationErrors.advance_rent_months
                    ? "advanceRentMonths-error"
                    : undefined
                }
              />
              <Hint icon={<CalendarRange size={14} className="text-slate-400" />}>
                Number of months to collect in advance (1-12).
              </Hint>
              {validationErrors.advance_rent_months ? (
                <FieldError id="advanceRentMonths-error">
                  {firstError(validationErrors.advance_rent_months)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="advanceRentAmount">
                Advance Rent Amount (MVR) *
                {selectedTenantUnit && form.advanceRentMonths ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({formatMVR(
                      Number(selectedTenantUnit.monthly_rent) *
                        Number(form.advanceRentMonths)
                    )}{" "}
                    calculated)
                  </span>
                ) : null}
              </Label>
              <Input
                id="advanceRentAmount"
                name="advanceRentAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="25000"
                value={form.advanceRentAmount}
                onChange={handleChange}
                disabled={disableSubmit || !selectedTenantUnit}
                required
                aria-describedby={
                  validationErrors.advance_rent_amount
                    ? "advanceRentAmount-error"
                    : undefined
                }
              />
              <Hint icon={<Wallet size={14} className="text-slate-400" />}>
                Total amount to collect. Auto-calculated from months, but can be edited.
              </Hint>
              {validationErrors.advance_rent_amount ? (
                <FieldError id="advanceRentAmount-error">
                  {firstError(validationErrors.advance_rent_amount)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Fieldset>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                disabled={disableSubmit || paymentMethodsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-describedby={
                  validationErrors.payment_method ? "paymentMethod-error" : undefined
                }
              >
                <option value="">Select payment method (optional)</option>
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {validationErrors.payment_method ? (
                <FieldError id="paymentMethod-error">
                  {firstError(validationErrors.payment_method)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="transactionDate">Transaction Date *</Label>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                value={form.transactionDate || new Date().toISOString().split("T")[0]}
                onChange={handleChange}
                disabled={disableSubmit}
                required
                aria-describedby={
                  validationErrors.transaction_date ? "transactionDate-error" : undefined
                }
              />
              <Hint icon={<CalendarRange size={14} className="text-slate-400" />}>
                Date when advance rent was collected.
              </Hint>
              {validationErrors.transaction_date ? (
                <FieldError id="transactionDate-error">
                  {firstError(validationErrors.transaction_date)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <Fieldset>
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              name="referenceNumber"
              type="text"
              placeholder="TRX-12345"
              value={form.referenceNumber}
              onChange={handleChange}
              disabled={disableSubmit}
              maxLength={100}
              aria-describedby={
                validationErrors.reference_number ? "referenceNumber-error" : undefined
              }
            />
            <Hint icon={<Wallet size={14} className="text-slate-400" />}>
              Optional. Transaction reference or receipt number.
            </Hint>
            {validationErrors.reference_number ? (
              <FieldError id="referenceNumber-error">
                {firstError(validationErrors.reference_number)}
              </FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Additional notes about this advance rent collection..."
              value={form.notes}
              onChange={handleChange}
              disabled={disableSubmit}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={validationErrors.notes ? "notes-error" : undefined}
            />
            {validationErrors.notes ? (
              <FieldError id="notes-error">
                {firstError(validationErrors.notes)}
              </FieldError>
            ) : null}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/tenant-units"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={disableSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Collecting…
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  Collect Advance Rent
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function buildTenantUnitLabel(tenantUnit) {
  if (!tenantUnit) {
    return "Tenant Unit";
  }

  const tenantName =
    tenantUnit?.tenant?.full_name ?? tenantUnit?.tenant_id ?? "Unknown";
  const unitNumber = tenantUnit?.unit?.unit_number ?? tenantUnit?.unit_id ?? "Unit";
  const propertyName = tenantUnit?.unit?.property?.name;

  if (propertyName) {
    return `${tenantName} • ${unitNumber} • ${propertyName}`;
  }

  return `${tenantName} • ${unitNumber}`;
}

function nameToApiKey(name) {
  const map = {
    tenantUnitId: "tenant_unit_id",
    advanceRentMonths: "advance_rent_months",
    advanceRentAmount: "advance_rent_amount",
    paymentMethod: "payment_method",
    transactionDate: "transaction_date",
    referenceNumber: "reference_number",
    notes: "notes",
  };

  return map[name] ?? name;
}

function firstError(error) {
  if (!error) {
    return null;
  }

  if (Array.isArray(error) && error.length > 0) {
    return error[0];
  }

  if (typeof error === "string") {
    return error;
  }

  return "Invalid value.";
}

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label
      {...props}
      className="text-sm font-semibold text-slate-700"
    >
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-xs font-medium text-red-500">
      {children}
    </p>
  );
}

function Hint({ children, icon }) {
  if (!children) {
    return null;
  }

  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
      {icon}
      <span>{children}</span>
    </p>
  );
}

export default function CollectAdvanceRentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">
          Loading advance rent collection form…
        </div>
      }
    >
      <CollectAdvanceRentPageContent />
    </Suspense>
  );
}


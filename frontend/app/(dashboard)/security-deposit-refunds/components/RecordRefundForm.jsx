"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { formatMVR as formatCurrency } from "@/lib/currency";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const formatDateInput = (date) => {
  if (!date) return "";
  const instance = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instance.getTime())) {
    return "";
  }
  const year = instance.getFullYear();
  const month = String(instance.getMonth() + 1).padStart(2, "0");
  const day = String(instance.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toAmount = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const firstError = (error) => {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
};

const statusFilters = [
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "cancelled", label: "Cancelled" },
];

const initialFormState = {
  tenant_unit_id: "",
  refund_number: "",
  refund_date: "",
  original_deposit: "0.00",
  deductions: "0.00",
  refund_amount: "0.00",
  deduction_note: "",
  status: "pending",
  payment_method: "",
  transaction_reference: "",
};

export function RecordRefundForm({ onSaved }) {
  const [tenantUnits, setTenantUnits] = useState([]);
  const [optionsError, setOptionsError] = useState(null);

  const [formValues, setFormValues] = useState({ ...initialFormState });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const {
    options: paymentMethodOptions,
    methods: paymentMethods,
    loading: paymentMethodLoading,
    error: paymentMethodError,
  } = usePaymentMethods({ onlyActive: true });

  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
      setFormValues((previous) => ({
        ...previous,
        refund_date: previous.refund_date || formatDateInput(new Date()),
      }));
    }
  }, [hydrated]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenantUnits() {
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in so we can load tenant unit information.");
        }

        const response = await fetch(`${API_BASE_URL}/tenant-units?per_page=200`, {
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
        if (!isMounted) return;
        setTenantUnits(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (!isMounted) return;
        setOptionsError(err.message);
      }
    }

    fetchTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const tenantUnitMap = useMemo(() => {
    return tenantUnits.reduce((acc, unit) => {
      if (unit?.id) {
        acc.set(unit.id, unit);
      }
      return acc;
    }, new Map());
  }, [tenantUnits]);

  const tenantUnitOptions = useMemo(() => {
    return tenantUnits
      .map((unit) => {
        const tenant = unit?.tenant?.full_name ?? `Tenant #${unit?.tenant_id}`;
        const labelUnit =
          unit?.unit?.unit_number ??
          (unit?.unit?.id ? `Unit #${unit.unit.id}` : `Unit #${unit?.unit_id}`);
        return {
          value: String(unit.id),
          label: `${tenant} · ${labelUnit}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenantUnits]);

  const handleFormChange = (name, value) => {
    setFormErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormValues((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "tenant_unit_id") {
        const selected = tenantUnitMap.get(Number(value));
        const deposit = selected?.security_deposit_paid ?? 0;
        next.original_deposit = toAmount(deposit).toFixed(2);
        const deductions = toAmount(next.deductions);
        const refundAmount = Math.max(toAmount(next.original_deposit) - deductions, 0);
        next.refund_amount = refundAmount.toFixed(2);
        return next;
      }

      if (name === "payment_method") {
        const method = paymentMethods.find((item) => item.name === value);
        if (!method?.supports_reference) {
          next.transaction_reference = "";
        }
      }

      if (["original_deposit", "deductions"].includes(name)) {
        const refundAmount = Math.max(
          toAmount(next.original_deposit) - toAmount(next.deductions),
          0,
        );
        next.refund_amount = refundAmount.toFixed(2);
      }

      return next;
    });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (formSubmitting) return;

    setFormSubmitting(true);
    setFormErrors({});
    setFormApiError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before recording a refund.");
      }

      const payload = buildRefundPayload(formValues);
      const response = await fetch(`${API_BASE_URL}/security-deposit-refunds`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        setFormErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to create refund (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const refund = result?.data ?? result;
      if (onSaved) onSaved(refund);
      setFormValues(initialFormState);
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.name === formValues.payment_method) ?? null,
    [formValues.payment_method, paymentMethods],
  );
  const paymentMethodOptionsWithPlaceholder = useMemo(() => {
    return [{ value: "", label: "Select method", data: null }, ...paymentMethodOptions];
  }, [paymentMethodOptions]);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 px-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Record a refund</h2>
        <p className="text-xs text-slate-500">
          Capture the details of the deposit returned, including any deductions you retained.
        </p>
      </div>

      {formApiError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          {formApiError}
        </div>
      ) : null}
      {optionsError ? (
        <p className="text-xs text-red-500">{optionsError} — tenant options may be limited.</p>
      ) : null}
      {paymentMethodError ? (
        <p className="text-xs text-red-500">{paymentMethodError}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Tenant unit" htmlFor="tenant_unit_id" required error={formErrors?.tenant_unit_id}>
          <select
            id="tenant_unit_id"
            name="tenant_unit_id"
            value={formValues.tenant_unit_id}
            onChange={(event) => handleFormChange("tenant_unit_id", event.target.value)}
            required
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
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
        </FormField>

        <FormField
          label="Refund number"
          htmlFor="refund_number"
          hint="Leave empty to auto-generate (e.g., SDR-202401-001)"
          error={formErrors?.refund_number}
        >
          <input
            id="refund_number"
            name="refund_number"
            value={formValues.refund_number}
            onChange={(event) => handleFormChange("refund_number", event.target.value)}
            placeholder="Auto-generated if left empty"
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Refund date" htmlFor="refund_date" required error={formErrors?.refund_date}>
          <input
            id="refund_date"
            name="refund_date"
            type="date"
            value={formValues.refund_date}
            onChange={(event) => handleFormChange("refund_date", event.target.value)}
            required
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField label="Status" htmlFor="status" error={formErrors?.status}>
          <select
            id="status"
            name="status"
            value={formValues.status}
            onChange={(event) => handleFormChange("status", event.target.value)}
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Original deposit (MVR)"
          htmlFor="original_deposit"
          required
          error={formErrors?.original_deposit}
        >
          <input
            id="original_deposit"
            name="original_deposit"
            type="number"
            value={formValues.original_deposit}
            onChange={(event) => handleFormChange("original_deposit", event.target.value)}
            min="0"
            step="0.01"
            required
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField
          label="Deductions (MVR)"
          htmlFor="deductions"
          error={formErrors?.deductions}
          hint="Auto-calculated if you enter a deduction note amount."
        >
          <input
            id="deductions"
            name="deductions"
            type="number"
            value={formValues.deductions}
            onChange={(event) => handleFormChange("deductions", event.target.value)}
            min="0"
            step="0.01"
            disabled={formSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField
          label="Refund amount (MVR)"
          htmlFor="refund_amount"
          error={formErrors?.refund_amount}
        >
          <input
            id="refund_amount"
            name="refund_amount"
            type="number"
            value={formValues.refund_amount}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
          />
        </FormField>
      </div>

      <FormITable label="Deduction note" error={formErrors?.deduction_note}>
        <textarea
          id="deduction_note"
          name="deduction_note"
          value={formValues.deduction_note}
          onChange={(event) => handleFormChange("deduction_note", event.target.value)}
          placeholder="Describe why any amount was retained from the deposit."
          disabled={formSubmitting}
          className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormITable>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Payment method"
          htmlFor="payment_method"
          error={formErrors?.payment_method}
        >
          <select
            id="payment_method"
            name="payment_method"
            value={formValues.payment_method}
            onChange={(event) => handleFormChange("payment_method", event.target.value)}
            disabled={formSubmitting || paymentMethodLoading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paymentMethodOptionsWithPlaceholder.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Transaction reference"
          htmlFor="transaction_reference"
          error={formErrors?.transaction_reference}
          hint={
            selectedMethod && !selectedMethod.supports_reference
              ? "References are not required for this payment method."
              : selectedMethod && selectedMethod.supports_reference
              ? "Provide the reference shared by the payer."
              : undefined
          }
        >
          <input
            id="transaction_reference"
            name="transaction_reference"
            value={formValues.transaction_reference}
            onChange={(event) => handleFormChange("transaction_reference", event.target.value)}
            placeholder="Bank reference, cheque number, etc."
            disabled={
              formSubmitting || (selectedMethod !== null && !selectedMethod.supports_reference)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setFormValues(initialFormState)}
          disabled={formSubmitting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear form
        </button>
        <button
          type="submit"
          disabled={formSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {formSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Plus size={16} />
              Record refund
            </>
          )}
        </button>
      </div>
    </form>
  );
}

const FormField = ({ label, htmlFor, children, error, required, hint }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
    {children}
    {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    {error ? <FieldError>{firstError(error)}</FieldError> : null}
  </div>
);

const FormITable = ({ label, children, error }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    {children}
    {error ? <FieldError>{firstError(error)}</FieldError> : null}
  </div>
);

const FieldError = ({ children }) => (
  <p className="text-xs font-medium text-red-500">{children}</p>
);

const buildRefundPayload = (values) => ({
  tenant_unit_id: values.tenant_unit_id ? Number(values.tenant_unit_id) : null,
  refund_number: (values.refund_number ?? "").trim(),
  refund_date: values.refund_date || null,
  original_deposit: Number(values.original_deposit ?? 0),
  deductions: Number(values.deductions ?? 0),
  refund_amount: Number(values.refund_amount ?? 0),
  deduction_reasons: values.deduction_note
    ? [
        {
          category: "Note",
          amount: Number(values.deductions ?? 0),
          note: values.deduction_note,
        },
      ]
    : [],
  status: values.status ?? "pending",
  payment_method: values.payment_method || null,
  transaction_reference: values.transaction_reference || null,
});



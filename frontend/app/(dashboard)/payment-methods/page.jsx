"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const initialFormState = {
  name: "",
  is_active: true,
  supports_reference: false,
  sort_order: 0,
};

export default function PaymentMethodsPage() {
  const {
    methods,
    loading,
    error,
    refresh,
  } = usePaymentMethods({ onlyActive: false });

  const [formValues, setFormValues] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);
  const [editingMethod, setEditingMethod] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);
  const [actionSubmittingId, setActionSubmittingId] = useState(null);

  useEffect(() => {
    if (!flashMessage) return;
    const timeout = setTimeout(() => setFlashMessage(null), 3200);
    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const sortedMethods = useMemo(() => {
    return methods
      .slice()
      .sort((a, b) => {
        if (a.sort_order === b.sort_order) {
          return a.name.localeCompare(b.name);
        }
        return a.sort_order - b.sort_order;
      });
  }, [methods]);

  const resetForm = () => {
    setFormValues(initialFormState);
    setFormErrors({});
    setFormApiError(null);
    setFormSubmitting(false);
    setEditingMethod(null);
  };

  const handleFormChange = (name, value) => {
    setFormErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleToggleBoolean = (name) => {
    setFormValues((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formSubmitting) return;

    setFormSubmitting(true);
    setFormErrors({});
    setFormApiError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before managing payment methods.");
      }

      const payload = {
        name: (formValues.name ?? "").trim(),
        is_active: Boolean(formValues.is_active),
        supports_reference: Boolean(formValues.supports_reference),
        sort_order: Number(formValues.sort_order ?? 0),
      };

      const endpoint = editingMethod
        ? `${API_BASE_URL}/payment-methods/${editingMethod.id}`
        : `${API_BASE_URL}/payment-methods`;

      const response = await fetch(endpoint, {
        method: editingMethod ? "PATCH" : "POST",
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
          `${editingMethod ? "Unable to update" : "Unable to create"} payment method (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refresh();
      setFlashMessage(
        editingMethod
          ? "Payment method updated successfully."
          : "Payment method created successfully.",
      );
      resetForm();
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormValues({
      name: method.name ?? "",
      is_active: Boolean(method.is_active),
      supports_reference: Boolean(method.supports_reference),
      sort_order: Number(method.sort_order ?? 0),
    });
    setFormErrors({});
    setFormApiError(null);
  };

  const performAction = async (method, changes, successMessage) => {
    if (!method?.id) return;

    try {
      setActionSubmittingId(method.id);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before updating payment methods.");
      }

      const response = await fetch(`${API_BASE_URL}/payment-methods/${method.id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to update payment method (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refresh();
      setFlashMessage(successMessage);
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleToggleActive = (method) => {
    performAction(method, { is_active: !method.is_active }, "Payment method updated.");
  };

  const handleToggleSupportsReference = (method) => {
    performAction(
      method,
      { supports_reference: !method.supports_reference },
      "Payment method updated.",
    );
  };

  const handleDelete = async (method) => {
    if (!method?.id) return;
    const confirmed = window.confirm(
      `Delete payment method "${method.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      setActionSubmittingId(method.id);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before deleting payment methods.");
      }

      const response = await fetch(`${API_BASE_URL}/payment-methods/${method.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete payment method (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refresh();
      setFlashMessage("Payment method deleted.");
      if (editingMethod?.id === method.id) {
        resetForm();
      }
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setActionSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Billing configuration
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <CreditCard size={24} className="text-primary" />
            Payment methods
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Manage the list of payment methods available across rent, maintenance, and refund
            workflows. Toggle availability, capture whether references are required, and control
            ordering.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {editingMethod ? "Update existing method" : "Create new method"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {editingMethod ? `Editing “${editingMethod.name}”` : "Add payment method"}
            </h2>
          </div>
          {editingMethod ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        {formApiError ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{formApiError}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField
            label="Name"
            htmlFor="name"
            required
            error={formErrors?.name}
            hint="Displayed in dropdowns and receipts."
          >
            <input
              id="name"
              name="name"
              value={formValues.name}
              onChange={(event) => handleFormChange("name", event.target.value)}
              placeholder="Bank transfer"
              required
              disabled={formSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FormField>

          <FormField
            label="Sort order"
            htmlFor="sort_order"
            error={formErrors?.sort_order}
            hint="Lower numbers appear first in dropdowns."
          >
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              min="0"
              max="65535"
              value={formValues.sort_order}
              onChange={(event) => handleFormChange("sort_order", event.target.value)}
              disabled={formSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FormField>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <button
              type="button"
              onClick={() => handleToggleBoolean("is_active")}
              disabled={formSubmitting}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition ${
                formValues.is_active
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {formValues.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {formValues.is_active ? "Active" : "Inactive"}
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Availability
              </p>
              <p className="text-xs text-slate-500">
                Inactive methods stay hidden from all forms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <button
              type="button"
              onClick={() => handleToggleBoolean("supports_reference")}
              disabled={formSubmitting}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition ${
                formValues.supports_reference
                  ? "bg-sky-100 text-sky-600"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {formValues.supports_reference ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {formValues.supports_reference ? "Reference required" : "No reference"}
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Reference requirement
              </p>
              <p className="text-xs text-slate-500">
                Determines whether forms should prompt for a reference/transaction number.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={formSubmitting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
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
                  {editingMethod ? "Update method" : "Add method"}
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-700">
            {flashMessage}
          </div>
        ) : null}

        {loading ? (
          <Loader message="Loading payment methods…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : sortedMethods.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto px-5 py-4">
            <table className="min-w-[720px] table-auto border-collapse text-sm text-slate-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold text-right">Sort order</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{method.name}</p>
                      <p className="text-xs text-slate-500">
                        Updated {formatDisplayDate(method?.updated_at ?? method?.created_at)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge active={method.is_active} />
                    </td>
                    <td className="px-3 py-3">
                      {method.supports_reference ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600">
                          <ShieldCheck size={14} />
                          Reference required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                          No reference
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-600">
                      {method.sort_order}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(method)}
                          disabled={actionSubmittingId === method.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {actionSubmittingId === method.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : method.is_active ? (
                            <ToggleRight size={14} />
                          ) : (
                            <ToggleLeft size={14} />
                          )}
                          {method.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSupportsReference(method)}
                          disabled={actionSubmittingId === method.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {method.supports_reference ? <ShieldCheck size={14} /> : <CreditCard size={14} />}
                          {method.supports_reference ? "Reference required" : "Allow without reference"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(method)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(method)}
                          disabled={actionSubmittingId === method.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionSubmittingId === method.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
      <CheckCircle2 size={14} />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
      Inactive
    </span>
  );
}

function FormField({ label, htmlFor, children, error, required, hint }) {
  return (
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
}

function FieldError({ children }) {
  return <p className="text-xs font-medium text-red-500">{children}</p>;
}

function Loader({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <p className="text-xs text-slate-400">
        This may take a moment if the API needs to wake up.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn't load payment methods
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Ensure you're logged in and the API server is reachable at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{API_BASE_URL}</code>
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <RefreshCcw size={16} />
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <CreditCard size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          No payment methods yet
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Use the form above to create the methods tenants can use.
        </p>
      </div>
    </div>
  );
}

function firstError(error) {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


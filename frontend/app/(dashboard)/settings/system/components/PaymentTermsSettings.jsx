"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function PaymentTermsSettings({ settings, onSuccess }) {
  const { updatePaymentTerms } = useSystemSettings();
  const [formData, setFormData] = useState({
    default_due_days: settings?.default_due_days || 30,
    late_fee_percentage: settings?.late_fee_percentage || 5.0,
    late_fee_fixed: settings?.late_fee_fixed || 0,
    grace_period_days: settings?.grace_period_days || 7,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? "" : parseFloat(value) || 0,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await updatePaymentTerms(formData);
      onSuccess?.(result.message || "Payment terms settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update payment terms settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="default_due_days"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Default Due Days
          </label>
          <input
            type="number"
            id="default_due_days"
            name="default_due_days"
            value={formData.default_due_days}
            onChange={handleChange}
            min="1"
            max="365"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="30"
          />
          <p className="mt-1 text-xs text-slate-500">
            Number of days before payment is due
          </p>
          {fieldErrors.default_due_days && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.default_due_days[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="grace_period_days"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Grace Period (Days)
          </label>
          <input
            type="number"
            id="grace_period_days"
            name="grace_period_days"
            value={formData.grace_period_days}
            onChange={handleChange}
            min="0"
            max="30"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="7"
          />
          <p className="mt-1 text-xs text-slate-500">
            Days after due date before late fees apply
          </p>
          {fieldErrors.grace_period_days && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.grace_period_days[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="late_fee_percentage"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Late Fee Percentage
          </label>
          <input
            type="number"
            id="late_fee_percentage"
            name="late_fee_percentage"
            value={formData.late_fee_percentage}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.1"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="5.0"
          />
          <p className="mt-1 text-xs text-slate-500">
            Percentage of invoice amount charged as late fee
          </p>
          {fieldErrors.late_fee_percentage && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.late_fee_percentage[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="late_fee_fixed"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Fixed Late Fee Amount
          </label>
          <input
            type="number"
            id="late_fee_fixed"
            name="late_fee_fixed"
            value={formData.late_fee_fixed}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-slate-500">
            Fixed amount charged as late fee (in addition to percentage)
          </p>
          {fieldErrors.late_fee_fixed && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.late_fee_fixed[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}


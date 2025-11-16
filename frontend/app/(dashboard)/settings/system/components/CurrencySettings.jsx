"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function CurrencySettings({ settings, onSuccess }) {
  const { updateCurrency } = useSystemSettings();
  const [formData, setFormData] = useState({
    primary: settings?.primary || "MVR",
    secondary: settings?.secondary || "USD",
    exchange_rate: settings?.exchange_rate || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "exchange_rate" ? parseFloat(value) || "" : value,
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
      const result = await updateCurrency(formData);
      onSuccess?.(result.message || "Currency settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update currency settings.");
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
            htmlFor="primary"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Primary Currency
          </label>
          <input
            type="text"
            id="primary"
            name="primary"
            value={formData.primary}
            onChange={handleChange}
            maxLength={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
            placeholder="MVR"
          />
          <p className="mt-1 text-xs text-slate-500">
            ISO 4217 currency code (e.g., MVR, USD)
          </p>
          {fieldErrors.primary && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.primary[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="secondary"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Secondary Currency
          </label>
          <input
            type="text"
            id="secondary"
            name="secondary"
            value={formData.secondary}
            onChange={handleChange}
            maxLength={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
            placeholder="USD"
          />
          <p className="mt-1 text-xs text-slate-500">
            ISO 4217 currency code (e.g., MVR, USD)
          </p>
          {fieldErrors.secondary && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.secondary[0]}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="exchange_rate"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Exchange Rate (Optional)
          </label>
          <input
            type="number"
            id="exchange_rate"
            name="exchange_rate"
            value={formData.exchange_rate}
            onChange={handleChange}
            step="0.0001"
            min="0"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="1.00"
          />
          <p className="mt-1 text-xs text-slate-500">
            Exchange rate from primary to secondary currency (if applicable)
          </p>
          {fieldErrors.exchange_rate && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.exchange_rate[0]}
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


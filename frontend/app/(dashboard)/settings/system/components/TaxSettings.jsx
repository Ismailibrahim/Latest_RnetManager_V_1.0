"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function TaxSettings({ settings, onSuccess }) {
  const { updateTax } = useSystemSettings();
  const [formData, setFormData] = useState({
    gst_percentage: settings?.gst_percentage ?? 6.0,
    gst_enabled: settings?.gst_enabled ?? true,
    gst_registration_number: settings?.gst_registration_number ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value === "" ? "" : (type === "number" ? parseFloat(value) || 0 : value),
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
      const result = await updateTax(formData);
      onSuccess?.(result.message || "Tax settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update tax settings.");
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

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            GST (Goods and Services Tax) Configuration
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            Configure GST settings for Maldives. GST will be applied to invoices based on these settings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="gst_enabled"
                name="gst_enabled"
                checked={formData.gst_enabled}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <label
                htmlFor="gst_enabled"
                className="text-sm font-medium text-slate-700"
              >
                Enable GST
              </label>
            </div>
            <p className="text-xs text-slate-500 ml-6">
              When enabled, GST will be calculated and applied to invoices.
            </p>
            {fieldErrors.gst_enabled && (
              <p className="mt-1 text-xs text-red-500 ml-6">
                {fieldErrors.gst_enabled[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gst_percentage"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              GST Percentage (%)
            </label>
            <input
              type="number"
              id="gst_percentage"
              name="gst_percentage"
              value={formData.gst_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="6.0"
            />
            <p className="mt-1 text-xs text-slate-500">
              GST percentage rate (default: 6% for Maldives). This rate will be applied when GST is enabled.
            </p>
            {fieldErrors.gst_percentage && (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.gst_percentage[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="gst_registration_number"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              GST Registration Number
            </label>
            <input
              type="text"
              id="gst_registration_number"
              name="gst_registration_number"
              value={formData.gst_registration_number}
              onChange={handleChange}
              maxLength={100}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Enter GST registration number"
            />
            <p className="mt-1 text-xs text-slate-500">
              Your GST registration number (optional)
            </p>
            {fieldErrors.gst_registration_number && (
              <p className="mt-1 text-xs text-red-500">
                {fieldErrors.gst_registration_number[0]}
              </p>
            )}
          </div>
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


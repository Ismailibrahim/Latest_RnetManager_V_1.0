"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function SystemPreferencesSettings({ settings, onSuccess }) {
  const { updateSystemPreferences } = useSystemSettings();
  const [formData, setFormData] = useState({
    timezone: settings?.timezone || "Indian/Maldives",
    date_format: settings?.date_format || "DD/MM/YYYY",
    time_format: settings?.time_format || "24h",
    locale: settings?.locale || "en_MV",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await updateSystemPreferences(formData);
      onSuccess?.(result.message || "System preferences updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update system preferences.");
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
            htmlFor="timezone"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="Indian/Maldives">Indian/Maldives (MVT)</option>
            <option value="UTC">UTC</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          </select>
          {fieldErrors.timezone && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.timezone[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="date_format"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Date Format
          </label>
          <select
            id="date_format"
            name="date_format"
            value={formData.date_format}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          </select>
          {fieldErrors.date_format && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.date_format[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="time_format"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Time Format
          </label>
          <select
            id="time_format"
            name="time_format"
            value={formData.time_format}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="24h">24-hour (24h)</option>
            <option value="12h">12-hour (12h)</option>
          </select>
          {fieldErrors.time_format && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.time_format[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="locale"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Locale
          </label>
          <select
            id="locale"
            name="locale"
            value={formData.locale}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="en_MV">English (Maldives)</option>
            <option value="en_US">English (US)</option>
            <option value="en_GB">English (UK)</option>
          </select>
          {fieldErrors.locale && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.locale[0]}
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


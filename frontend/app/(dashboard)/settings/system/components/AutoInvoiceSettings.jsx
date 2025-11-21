"use client";

import { useState } from "react";
import { AlertCircle, Calendar, Clock, Loader2, Save, CheckCircle, XCircle, Info } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function AutoInvoiceSettings({ settings, onSuccess }) {
  const { updateAutoInvoice } = useSystemSettings();
  const [formData, setFormData] = useState({
    enabled: settings?.enabled || false,
    day_of_month: settings?.day_of_month || 1,
    time: settings?.time || "09:00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await updateAutoInvoice(formData);
      onSuccess?.(result.message || "Auto-invoice settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update auto-invoice settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatLastRun = (lastRunAt) => {
    if (!lastRunAt) return "Never";
    try {
      const date = new Date(lastRunAt);
      return date.toLocaleString();
    } catch {
      return lastRunAt;
    }
  };

  const getStatusIcon = (status) => {
    if (status === "success") {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === "failed") {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  // Generate day options (1-28)
  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  // Generate time options (every hour from 00:00 to 23:00)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

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

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-800">How Auto-Invoice Works</p>
            <p className="text-blue-600">
              When enabled, the system will automatically generate rent invoices for all occupied tenants on the specified day of each month. 
              The invoices will be created at the configured time using the first day of the current month as the invoice date.
            </p>
          </div>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="enabled" className="text-sm font-semibold text-slate-700">
            Enable Automatic Invoice Generation
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Automatically generate rent invoices for all occupied tenants on the scheduled date
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            checked={formData.enabled}
            onChange={handleChange}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20"></div>
        </label>
      </div>

      {/* Configuration Fields - Only show when enabled */}
      {formData.enabled && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="day_of_month"
                className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Calendar className="h-4 w-4" />
                Day of Month
              </label>
              <select
                id="day_of_month"
                name="day_of_month"
                value={formData.day_of_month}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1
                      ? "st"
                      : day === 2
                      ? "nd"
                      : day === 3
                      ? "rd"
                      : "th"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Invoices will be generated on this day each month (1-28 only)
              </p>
              {fieldErrors.day_of_month && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.day_of_month[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="time"
                className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Clock className="h-4 w-4" />
                Time
              </label>
              <select
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Time of day to generate invoices (24-hour format)
              </p>
              {fieldErrors.time && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.time[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Run Status */}
      {settings && (settings.last_run_at || settings.last_run_status) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Last Run Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Last run:</span>
              <span className="font-medium text-slate-700">
                {formatLastRun(settings.last_run_at)}
              </span>
            </div>
            {settings.last_run_status && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Status:</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(settings.last_run_status)}
                  <span
                    className={`font-medium ${
                      settings.last_run_status === "success"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {settings.last_run_status === "success"
                      ? "Success"
                      : "Failed"}
                  </span>
                </div>
              </div>
            )}
            {settings.last_run_message && (
              <div className="mt-2 rounded bg-white p-2 text-xs text-slate-600">
                {settings.last_run_message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
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


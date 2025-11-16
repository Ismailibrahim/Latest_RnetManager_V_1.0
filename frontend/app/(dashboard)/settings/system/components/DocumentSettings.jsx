"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function DocumentSettings({ settings, onSuccess }) {
  const { updateDocuments } = useSystemSettings();
  const [formData, setFormData] = useState({
    retention_years: settings?.retention_years || 7,
    export_format: settings?.export_format || "csv",
    auto_export: settings?.auto_export || false,
    export_email: settings?.export_email || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      const result = await updateDocuments(formData);
      onSuccess?.(result.message || "Document settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update document settings.");
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
            htmlFor="retention_years"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Document Retention (Years)
          </label>
          <input
            type="number"
            id="retention_years"
            name="retention_years"
            value={formData.retention_years}
            onChange={handleChange}
            min="1"
            max="100"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="7"
          />
          <p className="mt-1 text-xs text-slate-500">
            Number of years to retain documents
          </p>
          {fieldErrors.retention_years && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.retention_years[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="export_format"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Export Format
          </label>
          <select
            id="export_format"
            name="export_format"
            value={formData.export_format}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          {fieldErrors.export_format && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.export_format[0]}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="auto_export"
              name="auto_export"
              checked={formData.auto_export}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <label
              htmlFor="auto_export"
              className="text-sm font-medium text-slate-700"
            >
              Enable automatic export
            </label>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="export_email"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Export Email
          </label>
          <input
            type="email"
            id="export_email"
            name="export_email"
            value={formData.export_email}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="export@example.com"
          />
          <p className="mt-1 text-xs text-slate-500">
            Email address to receive automatic exports
          </p>
          {fieldErrors.export_email && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.export_email[0]}
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


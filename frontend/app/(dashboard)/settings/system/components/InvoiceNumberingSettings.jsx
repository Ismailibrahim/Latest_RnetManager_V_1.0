"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function InvoiceNumberingSettings({ settings, onSuccess }) {
  const { updateInvoiceNumbering } = useSystemSettings();
  const [formData, setFormData] = useState({
    rent_invoice_prefix: settings?.rent_invoice_prefix || "RINV",
    maintenance_invoice_prefix: settings?.maintenance_invoice_prefix || "MINV",
    financial_record_prefix: settings?.financial_record_prefix || "FINV",
    maintenance_request_prefix: settings?.maintenance_request_prefix || "MREQ",
    subscription_invoice_prefix: settings?.subscription_invoice_prefix || "SINV",
    receipt_prefix: settings?.receipt_prefix || "RCPT",
    refund_prefix: settings?.refund_prefix || "SDR",
    format: settings?.format || "PREFIX-YYYYMM-SSS",
    reset_monthly: settings?.reset_monthly ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value.toUpperCase(),
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
      const result = await updateInvoiceNumbering(formData);
      onSuccess?.(result.message || "Invoice numbering settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update invoice numbering settings.");
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
            Invoice Number Prefixes
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="rent_invoice_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Rent Invoice Prefix
              </label>
              <input
                type="text"
                id="rent_invoice_prefix"
                name="rent_invoice_prefix"
                value={formData.rent_invoice_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="RINV"
              />
              {fieldErrors.rent_invoice_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.rent_invoice_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="maintenance_invoice_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Maintenance Invoice Prefix
              </label>
              <input
                type="text"
                id="maintenance_invoice_prefix"
                name="maintenance_invoice_prefix"
                value={formData.maintenance_invoice_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="MINV"
              />
              {fieldErrors.maintenance_invoice_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.maintenance_invoice_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="financial_record_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Financial Record Prefix
              </label>
              <input
                type="text"
                id="financial_record_prefix"
                name="financial_record_prefix"
                value={formData.financial_record_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="FINV"
              />
              {fieldErrors.financial_record_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.financial_record_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="maintenance_request_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Maintenance Request Prefix
              </label>
              <input
                type="text"
                id="maintenance_request_prefix"
                name="maintenance_request_prefix"
                value={formData.maintenance_request_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="MREQ"
              />
              {fieldErrors.maintenance_request_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.maintenance_request_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="subscription_invoice_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Subscription Invoice Prefix
              </label>
              <input
                type="text"
                id="subscription_invoice_prefix"
                name="subscription_invoice_prefix"
                value={formData.subscription_invoice_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="SINV"
              />
              {fieldErrors.subscription_invoice_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.subscription_invoice_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="receipt_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Receipt Prefix
              </label>
              <input
                type="text"
                id="receipt_prefix"
                name="receipt_prefix"
                value={formData.receipt_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="RCPT"
              />
              {fieldErrors.receipt_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.receipt_prefix[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="refund_prefix"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Refund Prefix
              </label>
              <input
                type="text"
                id="refund_prefix"
                name="refund_prefix"
                value={formData.refund_prefix}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                placeholder="SDR"
              />
              {fieldErrors.refund_prefix && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.refund_prefix[0]}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            Number Format
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="format"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Format
              </label>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="PREFIX-YYYYMM-SSS">PREFIX-YYYYMM-SSS</option>
                <option value="PREFIX-YYYY-SSS">PREFIX-YYYY-SSS</option>
                <option value="PREFIX-SSS">PREFIX-SSS</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Example: RINV-202401-001
              </p>
              {fieldErrors.format && (
                <p className="mt-1 text-xs text-red-500">
                  {fieldErrors.format[0]}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reset_monthly"
                name="reset_monthly"
                checked={formData.reset_monthly}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <label
                htmlFor="reset_monthly"
                className="text-sm font-medium text-slate-700"
              >
                Reset sequence numbers monthly
              </label>
            </div>
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


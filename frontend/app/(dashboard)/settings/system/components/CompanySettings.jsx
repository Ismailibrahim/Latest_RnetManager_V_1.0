"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function CompanySettings({ settings, onSuccess }) {
  const { updateCompany } = useSystemSettings();
  const [formData, setFormData] = useState({
    name: settings?.name || "",
    address: settings?.address || "",
    city: settings?.city || "",
    country: settings?.country || "Maldives",
    tax_id: settings?.tax_id || "",
    registration_number: settings?.registration_number || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    website: settings?.website || "",
    logo_url: settings?.logo_url || "",
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
      const result = await updateCompany(formData);
      onSuccess?.(result.message || "Company settings updated successfully.");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
        setError(err.message || "Please review the highlighted fields.");
      } else {
        setError(err.message || "Unable to update company settings.");
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
            htmlFor="name"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Company Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter company name"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="+960 7XX-XXXX"
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="address"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter company address"
          />
          {fieldErrors.address && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.address[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="city"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter city"
          />
          {fieldErrors.city && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.city[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="country"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter country"
          />
          {fieldErrors.country && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.country[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="tax_id"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Tax ID
          </label>
          <input
            type="text"
            id="tax_id"
            name="tax_id"
            value={formData.tax_id}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter tax ID"
          />
          {fieldErrors.tax_id && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.tax_id[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="registration_number"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Registration Number
          </label>
          <input
            type="text"
            id="registration_number"
            name="registration_number"
            value={formData.registration_number}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Enter registration number"
          />
          {fieldErrors.registration_number && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.registration_number[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="company@example.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="website"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="https://example.com"
          />
          {fieldErrors.website && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.website[0]}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="logo_url"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Logo URL
          </label>
          <input
            type="url"
            id="logo_url"
            name="logo_url"
            value={formData.logo_url}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="https://example.com/logo.png"
          />
          {fieldErrors.logo_url && (
            <p className="mt-1 text-xs text-red-500">
              {fieldErrors.logo_url[0]}
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


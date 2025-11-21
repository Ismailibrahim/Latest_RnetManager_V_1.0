"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Users, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const initialForm = {
  companyName: "",
  subscriptionTier: "pro",
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
};

export default function NewOwnerPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in before creating an owner.");
      }

      // Build payload - include company_name only if it has a value
      const payload = {
        subscription_tier: form.subscriptionTier || "pro",
        owner: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
        },
      };

      // Only include company_name if it has a value
      if (form.companyName.trim()) {
        payload.company_name = form.companyName.trim();
      }

      // Only include password if provided
      if (form.password.trim()) {
        payload.owner.password = form.password.trim();
      }

      const response = await fetch(`${API_BASE_URL}/landlords`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 422) {
          const errors = data?.errors ?? {};
          const errorMessages = Object.entries(errors)
            .map(([field, messages]) => {
              const fieldLabel = field.replace(/_/g, ' ').replace(/owner\./g, '').replace(/\b\w/g, l => l.toUpperCase());
              const messageText = Array.isArray(messages) ? messages[0] : messages;
              return `${fieldLabel}: ${messageText}`;
            })
            .join('; ');
          
          throw new Error(errorMessages || data?.message || "Validation error. Please check the form fields.");
        }
        
        throw new Error(data?.message ?? `Failed to create owner (HTTP ${response.status})`);
      }

      setSuccess(true);
      setForm(initialForm);
      setTimeout(() => {
        router.push("/owners");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/owners"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Back</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Building2 size={24} className="text-primary" />
            Create a property owner
          </h1>
          <p className="text-sm text-slate-600">Add a landlord with the primary owner user.</p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>Owner created successfully. Redirecting…</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="companyName" className="text-sm font-semibold text-slate-700">
              Company name <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Rainbow Properties Pvt Ltd (or leave blank for individual owner)"
              value={form.companyName}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">
              If left blank, the owner&apos;s full name will be used as the company name.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subscriptionTier" className="text-sm font-semibold text-slate-700">
              Subscription tier
            </label>
            <select
              id="subscriptionTier"
              name="subscriptionTier"
              value={form.subscriptionTier}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                Owner first name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="Aisha"
                value={form.firstName}
                onChange={handleChange}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">
                Owner last name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Ibrahim"
                value={form.lastName}
                onChange={handleChange}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Owner email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="owner@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mobile" className="text-sm font-semibold text-slate-700">
                Owner mobile *
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                placeholder="+960 7XXXXXX"
                value={form.mobile}
                onChange={handleChange}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Owner password <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Password123!"
              value={form.password}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/owners"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Users size={16} />
                  Create owner
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

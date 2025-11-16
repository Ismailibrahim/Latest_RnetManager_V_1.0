"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Users, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

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
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[name === "companyName" ? "company_name" : name];
      delete next[name.startsWith("owner.") ? name : `owner.${name}`];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in before creating an owner.");
      }

      const payload = {
        company_name: form.companyName.trim(),
        subscription_tier: form.subscriptionTier || "pro",
        owner: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          password: form.password || undefined,
        },
      };

      if (!payload.company_name) {
        throw new Error("Company name is required.");
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

      if (response.status === 422) {
        const data = await response.json();
        setValidationErrors(data?.errors ?? {});
        throw new Error(data?.message ?? "Validation error.");
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? `Failed (HTTP ${response.status}).`);
      }

      setSuccess(true);
      setForm(initialForm);
      setTimeout(() => {
        router.push("/properties");
        router.refresh();
      }, 1000);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
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
        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>Owner created successfully. Redirecting…</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Fieldset>
            <Label htmlFor="companyName">
              Company name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="Rainbow Properties Pvt Ltd"
              value={form.companyName}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-required="true"
            />
            {validationErrors.company_name ? (
              <FieldError>{validationErrors.company_name[0]}</FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="subscriptionTier">Subscription tier</Label>
            <select
              id="subscriptionTier"
              name="subscriptionTier"
              value={form.subscriptionTier}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              suppressHydrationWarning
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fieldset>
              <Label htmlFor="firstName">Owner first name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Aisha"
                value={form.firstName}
                onChange={handleChange}
                disabled={submitting}
              />
              {validationErrors["owner.first_name"] ? (
                <FieldError>{validationErrors["owner.first_name"][0]}</FieldError>
              ) : null}
            </Fieldset>
            <Fieldset>
              <Label htmlFor="lastName">Owner last name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Ibrahim"
                value={form.lastName}
                onChange={handleChange}
                disabled={submitting}
              />
              {validationErrors["owner.last_name"] ? (
                <FieldError>{validationErrors["owner.last_name"][0]}</FieldError>
              ) : null}
            </Fieldset>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fieldset>
              <Label htmlFor="email">Owner email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="owner@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={submitting}
              />
              {validationErrors["owner.email"] ? (
                <FieldError>{validationErrors["owner.email"][0]}</FieldError>
              ) : null}
            </Fieldset>
            <Fieldset>
              <Label htmlFor="mobile">Owner mobile</Label>
              <Input
                id="mobile"
                name="mobile"
                placeholder="+960 7XXXXXX"
                value={form.mobile}
                onChange={handleChange}
                disabled={submitting}
              />
              {validationErrors["owner.mobile"] ? (
                <FieldError>{validationErrors["owner.mobile"][0]}</FieldError>
              ) : null}
            </Fieldset>
          </div>

          <Fieldset>
            <Label htmlFor="password">Owner password (optional)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Password123!"
              value={form.password}
              onChange={handleChange}
              disabled={submitting}
            />
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
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

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label {...props} className="text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      suppressHydrationWarning
    />
  );
}

function FieldError({ children }) {
  return <p className="text-xs font-medium text-red-500">{children}</p>;
}



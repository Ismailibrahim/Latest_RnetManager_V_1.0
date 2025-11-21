"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const initialFormState = {
  name: "",
  address: "",
  type: "residential",
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [unitsLimit, setUnitsLimit] = useState(null);
  const [unitsUsed, setUnitsUsed] = useState(null);
  const [billingError, setBillingError] = useState(null);

  // Fetch billing settings to show units remaining
  useEffect(() => {
    let isMounted = true;

    async function fetchBilling() {
      setBillingError(null);
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          return; // silently ignore when not authenticated
        }

        const response = await fetch(`${API_BASE_URL}/settings/billing`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Do not block the screen; just record an error
          setBillingError("Unable to load plan limits right now.");
          return;
        }

        const payload = await response.json();
        const limit = payload?.plan?.limits?.units ?? null;
        const usedMetric = Array.isArray(payload?.usage)
          ? payload.usage.find((u) => u?.key === "units")
          : null;
        const used = usedMetric?.used ?? null;

        if (!isMounted) return;
        setUnitsLimit(limit);
        setUnitsUsed(used);
      } catch {
        if (!isMounted) return;
        setBillingError("Unable to load plan limits right now.");
      }
    }

    fetchBilling();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before creating a property.");
      }

      const response = await fetch(`${API_BASE_URL}/properties`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (response.status === 422) {
        const payload = await response.json();
        setValidationErrors(payload.errors ?? {});
        throw new Error(payload.message ?? "Validation error.");
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Could not create property (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setSuccess(true);
      setForm(initialFormState);

      setTimeout(() => {
        router.push("/properties");
        router.refresh();
      }, 1200);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/properties"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Building2 size={24} className="text-primary" />
            Add a Property
          </h1>
          <p className="text-sm text-slate-600">
            Record a new building in your portfolio. You can add units after it
            is created.
          </p>
          {unitsLimit !== null && unitsUsed !== null ? (
            <p className="mt-1 text-xs text-slate-500">
              Units remaining on your plan:{" "}
              <span className="font-semibold text-slate-700">
                {Math.max(0, unitsLimit - unitsUsed)}
              </span>{" "}
              of {unitsLimit}.
            </p>
          ) : billingError ? (
            <p className="mt-1 text-xs text-slate-400">{billingError}</p>
          ) : null}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {apiError && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>
              Property created successfully. Redirecting you back to the
              properties list…
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Fieldset>
            <Label htmlFor="name">Property name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Lagoon View Apartments"
              value={form.name}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={validationErrors.name ? "name-error" : undefined}
            />
            {validationErrors.name && (
              <FieldError id="name-error">{validationErrors.name[0]}</FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              name="address"
              placeholder="Street, City, Postal code"
              value={form.address}
              onChange={handleChange}
              disabled={submitting}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.address ? "address-error" : undefined
              }
            />
            {validationErrors.address && (
              <FieldError id="address-error">
                {validationErrors.address[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="type">Property type</Label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={validationErrors.type ? "type-error" : undefined}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
            {validationErrors.type && (
              <FieldError id="type-error">{validationErrors.type[0]}</FieldError>
            )}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/properties"
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
                  <Building2 size={16} />
                  Create property
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
    <label
      {...props}
      className="text-sm font-semibold text-slate-700"
    >
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-xs font-medium text-red-500">
      {children}
    </p>
  );
}


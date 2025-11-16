"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const initialFormState = {
  email: "",
  password: "",
  remember: false,
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          device_name: "web",
        }),
      });

      if (response.status === 422) {
        const payload = await response.json();
        setFieldErrors(payload.errors ?? {});
        throw new Error(
          payload.message ??
            "We couldn't verify those details. Please try again.",
        );
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Something went wrong (HTTP ${response.status}). Please try again.`;
        throw new Error(message);
      }

      const payload = await response.json();

      localStorage.setItem("auth_token", payload.token);
      if (payload.user) {
        localStorage.setItem("auth_user", JSON.stringify(payload.user));
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <header className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            RentApplicaiton
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to manage properties, tenants, and collections.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {apiError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle
              size={18}
              className="mt-0.5 flex-shrink-0 text-red-600"
            />
            <div>
              <p className="font-medium">{apiError}</p>
              <p className="text-xs text-red-600/80">
                Double-check your email and password, then try again.
              </p>
            </div>
          </div>
        )}

        <Fieldset>
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className="pl-11"
            />
          </div>
          {fieldErrors.email && (
            <FieldError id="email-error">{fieldErrors.email[0]}</FieldError>
          )}
        </Fieldset>

        <Fieldset>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
              className="pl-11"
            />
          </div>
          {fieldErrors.password && (
            <FieldError id="password-error">
              {fieldErrors.password[0]}
            </FieldError>
          )}
        </Fieldset>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
              disabled={submitting}
              className="h-4 w-4 rounded border-slate-300 bg-white text-primary focus:ring-primary/60"
            />
            Remember this device
          </label>
          <Link
            href="#"
            className="font-medium text-primary transition hover:text-primary/80 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Sign in securely
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Fieldset({ children }) {
  return <div className="space-y-2">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label
      {...props}
      className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
    >
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      suppressHydrationWarning
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50 ${className}`}
    />
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-xs font-medium text-red-600">
      {children}
    </p>
  );
}


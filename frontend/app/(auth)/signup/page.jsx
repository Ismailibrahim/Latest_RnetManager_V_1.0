"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const initialFormState = {
  full_name: "",
  email: "",
  password: "",
  password_confirmation: "",
  subscription_tier: "",
  mobile: "",
  company: "",
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState(null);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });

  // Fetch subscription limits on component mount
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/subscription-limits`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionLimits(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch subscription limits:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchLimits();
  }, []);

  // Check password strength
  useEffect(() => {
    const password = form.password;
    setPasswordStrength({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&#]/.test(password),
    });
  }, [form.password]);

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
    setApiError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        throw new Error(data.message || "Signup failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedTierLimits = () => {
    if (!subscriptionLimits || !form.subscription_tier) return null;
    return subscriptionLimits[form.subscription_tier];
  };

  const selectedLimits = getSelectedTierLimits();

  if (success) {
    return (
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Signup Successful!
          </h2>
          <p className="text-slate-600">
            Your account is pending approval by an administrator.
          </p>
          <p className="text-sm text-slate-500">
            You will receive an email notification once your account is approved.
          </p>
          <p className="text-sm text-slate-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl max-w-4xl mx-auto">
      <header className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            RentApplication
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign up to start managing your properties and tenants.
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
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Fieldset>
            <Label htmlFor="full_name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                value={form.full_name}
                onChange={handleChange}
                disabled={submitting}
                required
                className="pl-11"
              />
            </div>
            {fieldErrors.full_name && (
              <FieldError>{fieldErrors.full_name[0]}</FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
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
                required
                className="pl-11"
              />
            </div>
            {fieldErrors.email && (
              <FieldError>{fieldErrors.email[0]}</FieldError>
            )}
          </Fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Fieldset>
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
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
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                disabled={submitting}
                required
                className="pl-11"
              />
            </div>
            {form.password && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  {passwordStrength.length ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-slate-400" />
                  )}
                  <span className={passwordStrength.length ? "text-green-600" : "text-slate-500"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.upper && passwordStrength.lower ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-slate-400" />
                  )}
                  <span className={passwordStrength.upper && passwordStrength.lower ? "text-green-600" : "text-slate-500"}>
                    Upper and lowercase letters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.number ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-slate-400" />
                  )}
                  <span className={passwordStrength.number ? "text-green-600" : "text-slate-500"}>
                    At least one number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordStrength.special ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-slate-400" />
                  )}
                  <span className={passwordStrength.special ? "text-green-600" : "text-slate-500"}>
                    At least one special character (@$!%*?&#)
                  </span>
                </div>
              </div>
            )}
            {fieldErrors.password && (
              <FieldError>{fieldErrors.password[0]}</FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="password_confirmation">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={handleChange}
                disabled={submitting}
                required
                className="pl-11"
              />
            </div>
            {fieldErrors.password_confirmation && (
              <FieldError>{fieldErrors.password_confirmation[0]}</FieldError>
            )}
          </Fieldset>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Fieldset>
            <Label htmlFor="subscription_tier">
              Subscription Tier <span className="text-red-500">*</span>
            </Label>
            <select
              id="subscription_tier"
              name="subscription_tier"
              value={form.subscription_tier}
              onChange={handleChange}
              disabled={submitting || loadingLimits}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50"
            >
              <option value="">Select a tier</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {fieldErrors.subscription_tier && (
              <FieldError>{fieldErrors.subscription_tier[0]}</FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="mobile">
              Mobile Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                placeholder="+960 123-4567"
                autoComplete="tel"
                value={form.mobile}
                onChange={handleChange}
                disabled={submitting}
                required
                className="pl-11"
              />
            </div>
            {fieldErrors.mobile && (
              <FieldError>{fieldErrors.mobile[0]}</FieldError>
            )}
          </Fieldset>
        </div>

        <Fieldset>
          <Label htmlFor="company">Company Name (Optional)</Label>
          <div className="relative">
            <Building2
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <Input
              id="company"
              name="company"
              type="text"
              placeholder="Your Company Name"
              autoComplete="organization"
              value={form.company}
              onChange={handleChange}
              disabled={submitting}
              className="pl-11"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            If not provided, your full name will be used as the company name.
          </p>
          {fieldErrors.company && (
            <FieldError>{fieldErrors.company[0]}</FieldError>
          )}
        </Fieldset>

        {/* Subscription Limits Display */}
        {selectedLimits && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {form.subscription_tier.charAt(0).toUpperCase() + form.subscription_tier.slice(1)} Plan Limits
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Max Properties</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedLimits.max_properties}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Max Units</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedLimits.max_units}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Max Users</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedLimits.max_users}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Monthly Price</p>
                <p className="text-lg font-semibold text-slate-900">
                  {parseFloat(selectedLimits.monthly_price) === 0
                    ? "Free"
                    : `$${selectedLimits.monthly_price}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Create account
            </>
          )}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition hover:text-primary/80 hover:underline"
          >
            Sign in
          </Link>
        </p>
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

function FieldError({ children }) {
  return <p className="text-xs font-medium text-red-600">{children}</p>;
}

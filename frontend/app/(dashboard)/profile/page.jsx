"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Shield,
  SquareGanttChart,
  Users,
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const FALLBACK_PROFILE = {
  initials: "RA",
  name: "RentApplicaiton Admin",
  email: "admin@example.com",
  role: "Owner",
  organization: "Your portfolio",
  phone: "—",
};

function buildProfile(user) {
  if (!user) {
    return FALLBACK_PROFILE;
  }

  const firstName = user.first_name?.trim() || user.full_name?.split(" ")?.[0] || "there";
  const lastName = user.last_name?.trim() ?? "";
  const fullName =
    user.full_name?.trim() ||
    [user.first_name, user.last_name]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .trim() ||
    "RentApplicaiton Admin";

  const initialsSource =
    (user.first_name && user.last_name
      ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`
      : fullName
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)) || "RA";

  const roleLabel = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Owner";

  const organization =
    user.landlord?.company_name?.trim() ||
    FALLBACK_PROFILE.organization;

  return {
    initials: initialsSource.toUpperCase(),
    name: fullName,
    firstName,
    email: user.email ?? FALLBACK_PROFILE.email,
    role: roleLabel,
    organization,
    phone: user.mobile ?? FALLBACK_PROFILE.phone,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    emailVerifiedAt: user.email_verified_at,
  };
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

function formatJoinedDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined) {
    return "—";
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numeric);
}

function formatDateShort(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

function titleCase(value) {
  if (!value) return "—";
  return value
    .toString()
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (txt) => txt[0].toUpperCase() + txt.slice(1));
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(FALLBACK_PROFILE);
  const [delegates, setDelegates] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Not authenticated. Please log in.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/account`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch((fetchError) => {
        // Network error (CORS, server down, etc.)
        if (fetchError instanceof TypeError && fetchError.message === "Failed to fetch") {
          throw new Error(
            `Unable to connect to the server. Please ensure the backend is running at ${API_BASE_URL}. This could be a CORS issue or the server may not be running.`
          );
        }
        throw fetchError;
      });

      const payload = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMessage = payload?.message || `Failed to load account data (HTTP ${response.status})`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setProfile(buildProfile(payload?.user));
      setDelegates(payload?.delegates || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while loading profile";
      setError(errorMessage);
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setSubscriptionLoading(true);

      if (typeof window === "undefined") {
        setSubscriptionLoading(false);
        return;
      }

      const token = localStorage.getItem("auth_token");
      if (!token) {
        setSubscriptionLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings/billing`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);

      if (!response || !response.ok) {
        setSubscriptionLoading(false);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setSubscription(payload);
    } catch (err) {
      console.error("Subscription fetch error:", err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountData();
    fetchSubscriptionData();
  }, [fetchAccountData, fetchSubscriptionData]);

  useEffect(() => {
    const handleAccountUpdated = (event) => {
      if (event?.detail?.user) {
        setProfile(buildProfile(event.detail.user));
      }
    };

    window.addEventListener("account:updated", handleAccountUpdated);
    return () => window.removeEventListener("account:updated", handleAccountUpdated);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAccountData}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {profile.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {profile.name}
              </h1>
              {profile.emailVerifiedAt && (
                <span className="badge inline-flex items-center gap-1">
                  <BadgeCheck size={14} />
                  Verified
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {profile.email}
              </span>
              {profile.phone && profile.phone !== "—" && (
                <span className="inline-flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            {profile.role} · {profile.organization}
          </div>
          {profile.lastLoginAt && (
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-primary" />
              Last login {formatDate(profile.lastLoginAt)}
            </div>
          )}
          {profile.createdAt && (
            <div className="flex items-center gap-2">
              <SquareGanttChart size={16} className="text-primary" />
              Using RentApplicaiton since {formatJoinedDate(profile.createdAt)}
            </div>
          )}
        </div>
      </header>

      {subscription && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Subscription Plan
              </h3>
              <p className="text-xs text-slate-500">
                Your current subscription and usage details.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-xs font-semibold text-slate-600">
                {subscription.plan?.status === "active" ? "Active" : "—"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Current Plan
                </p>
              </div>
              <h4 className="text-lg font-semibold text-slate-900">
                {subscription.plan?.name || "—"}
              </h4>
              <p className="text-sm text-slate-600">
                {formatCurrency(subscription.plan?.monthly_price, subscription.plan?.currency)}/month
              </p>
              {subscription.plan?.next_renewal_date && (
                <p className="mt-2 text-xs text-slate-500">
                  Next renewal: {formatDateShort(subscription.plan?.next_renewal_date)}
                </p>
              )}
            </div>

            {subscription.plan?.features && subscription.plan.features.length > 0 && (
              <div className="rounded-xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Plan Features
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {subscription.plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                      <span>{titleCase(feature)}</span>
                    </li>
                  ))}
                  {subscription.plan.features.length > 4 && (
                    <li className="text-xs text-slate-500 pl-6">
                      +{subscription.plan.features.length - 4} more features
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {subscription.usage && subscription.usage.length > 0 && (
            <div className="rounded-xl border border-slate-200/70 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Usage & Limits
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {subscription.usage.map((metric) => {
                  const percentage = metric.limit
                    ? Math.min(100, (metric.used / metric.limit) * 100)
                    : 0;
                  const isNearLimit = percentage >= 80;
                  
                  return (
                    <div key={metric.key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900">{metric.label}</span>
                        <span className="text-slate-600">
                          {metric.used} / {metric.limit ?? "∞"}
                        </span>
                      </div>
                      {metric.limit && (
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all ${
                              isNearLimit ? "bg-warning" : "bg-primary"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-slate-500">{metric.helper}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {delegates.length > 0 && (
        <section className="card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Team members
            </h3>
            <p className="text-xs text-slate-500">
              Other users in your organization.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {delegates.map((person) => {
              const fullName = person.full_name || 
                [person.first_name, person.last_name].filter(Boolean).join(" ") || 
                person.email;
              const roleLabel = person.role
                ? person.role.charAt(0).toUpperCase() + person.role.slice(1)
                : "Member";
              
              return (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(fullName)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{fullName}</p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                    {person.email && (
                      <p className="text-xs text-slate-400">{person.email}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Account information
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Email verification</p>
              <p className="text-xs text-slate-500">
                {profile.emailVerifiedAt
                  ? `Verified on ${formatDateShort(profile.emailVerifiedAt)}`
                  : "Email not verified"}
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Account status</p>
              <p className="text-xs text-slate-500">
                Active account
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Member since</p>
              <p className="text-xs text-slate-500">
                {profile.createdAt ? formatJoinedDate(profile.createdAt) : "—"}
              </p>
            </li>
          </ul>
        </div>

        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Security & Privacy
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">
                Password
              </p>
              <p className="text-xs text-slate-500">
                Manage your password in account settings
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Login history</p>
              <p className="text-xs text-slate-500">
                {profile.lastLoginAt
                  ? `Last login: ${formatDate(profile.lastLoginAt)}`
                  : "No login history available"}
              </p>
            </li>
            <li className="rounded-xl border border-slate-200/70 bg-white px-4 py-3">
              <p className="font-semibold text-slate-900">Account settings</p>
              <p className="text-xs text-slate-500">
                Update your profile and preferences
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

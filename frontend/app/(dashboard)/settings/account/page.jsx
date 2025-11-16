"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plug,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Users,
  X,
  Plus,
  Trash2,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const PERSONAL_DETAIL_FIELDS = [
  { key: "full_name", label: "Name", icon: UserRound },
  { key: "email", label: "Email", icon: Mail },
  { key: "mobile", label: "Phone", icon: Phone },
];

const EMPTY_DETAILS = {
  id: null,
  first_name: "",
  last_name: "",
  full_name: "",
  email: "",
  mobile: "",
};

class ApiValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ApiValidationError";
    this.errors = errors ?? {};
  }
}

function formatAccountUser(user) {
  if (!user) {
    return EMPTY_DETAILS;
  }

  const first = user.first_name ?? "";
  const last = user.last_name ?? "";
  const full =
    user.full_name ??
    [first, last]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .trim();

  return {
    id: user.id ?? null,
    first_name: first,
    last_name: last,
    full_name: full,
    email: user.email ?? "",
    mobile: user.mobile ?? "",
  };
}

const authentication = [
  {
    title: "Password",
    status: "Update your account password",
    action: "Update password",
    actionType: "password",
  },
  {
    title: "Multi-factor authentication",
    status: "Coming soon",
    action: "Coming soon",
    actionType: "mfa",
    disabled: true,
  },
  {
    title: "Security questions",
    status: "Coming soon",
    action: "Coming soon",
    actionType: "questions",
    disabled: true,
  },
];

const notificationPrefs = [
  {
    channel: "Email",
    description: "Invoices, tenant escalations, compliance reminders",
    active: true,
  },
  {
    channel: "SMS",
    description: "Urgent maintenance alerts and team mentions",
    active: true,
  },
  {
    channel: "In-app",
    description: "All portfolio insights and automation updates",
    active: true,
  },
];

// Empty integrations array as requested
const integrations = [];


export default function AccountSettingsPage() {
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [meta, setMeta] = useState({ roles: [], delegates_count: 0 });
  const [delegateSeed, setDelegateSeed] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [delegatesOpen, setDelegatesOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return undefined;
    const timeoutId = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (!comingSoonMessage) return undefined;
    const timeoutId = setTimeout(() => setComingSoonMessage(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [comingSoonMessage]);

  const fetchAccount = useCallback(async () => {
    setLoadingDetails(true);
    setDetailsError("");

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to load account information.");
      }

      const response = await fetch(`${API_BASE_URL}/account`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ?? `Unable to load account information (HTTP ${response.status}).`,
        );
      }

      setDetails(formatAccountUser(payload?.user));
      const initialDelegates = normalizeDelegatesList(payload);
      setDelegateSeed(initialDelegates);
      setMeta({
        roles: payload?.meta?.roles ?? [],
        delegates_count: payload?.meta?.delegates_count ?? initialDelegates.length ?? 0,
      });
    } catch (error) {
      setDetailsError(error.message ?? "We could not load your account information.");
      setDetails(EMPTY_DETAILS);
      setDelegateSeed([]);
      setMeta({ roles: [], delegates_count: 0 });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const updateAccount = useCallback(async (values) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in before updating your profile.");
    }

    const response = await fetch(`${API_BASE_URL}/account`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 422) {
      throw new ApiValidationError(
        payload?.message ?? "Please review the highlighted fields.",
        payload?.errors ?? {},
      );
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ?? `Unable to update account (HTTP ${response.status}).`,
      );
    }

    return {
      user: payload?.user,
      message: payload?.message ?? "Profile updated successfully.",
    };
  }, []);

  const updatePassword = useCallback(async (values) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in before updating your password.");
    }

    const response = await fetch(`${API_BASE_URL}/account/password`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 422) {
      throw new ApiValidationError(
        payload?.message ?? "Please review the highlighted fields.",
        payload?.errors ?? {},
      );
    }

    if (!response.ok) {
      throw new Error(
        payload?.message ?? `Unable to update password (HTTP ${response.status}).`,
      );
    }

    return {
      message: payload?.message ?? "Password updated successfully.",
    };
  }, []);

  const handleOpenEdit = (fieldKey = null) => {
    if (loadingDetails || detailsError) return;
    setActiveField(fieldKey);
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setActiveField(null);
  };

  const handleSaveProfile = async (values) => {
    const { user, message } = await updateAccount(values);
    setDetails(formatAccountUser(user));
    setIsEditing(false);
    setActiveField(null);
    setSuccessMessage(message);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("account:updated", {
          detail: { user },
        }),
      );
    }
  };

  const delegateCountBadge = useMemo(() => {
    const count = meta.delegates_count ?? 0;
    if (count <= 0) return null;
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
        {count}
      </span>
    );
  }, [meta.delegates_count]);

  const handleDelegatesUpdated = useCallback((count) => {
    setMeta((previous) => ({
      ...previous,
      delegates_count: count,
    }));
  }, []);

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {comingSoonMessage ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-700">
          {comingSoonMessage}
        </div>
      ) : null}

      <section className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="badge">
            <ShieldCheck size={14} />
            Account controls
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Account Settings</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage personal information, security policies, and integrations for your
            RentApplicaiton admin account.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            Last security review completed 05 Nov 2025
          </div>
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            Active sessions: Maldives HQ, iPad Pro
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <UserRound size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
              <p className="text-xs text-slate-500">Keep your contact details current.</p>
            </div>
          </header>

          {detailsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Unable to load profile</p>
                  <p className="text-xs text-red-600">{detailsError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchAccount}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Retry
              </button>
            </div>
          ) : loadingDetails ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          ) : (
            <dl className="grid gap-3 text-sm text-slate-600">
              {PERSONAL_DETAIL_FIELDS.map(({ key, label, icon }) => (
                <InfoRow
                  key={key}
                  icon={icon}
                  label={label}
                  value={details[key]}
                  onEdit={() => handleOpenEdit(key === "full_name" ? null : key)}
                />
              ))}
            </dl>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => handleOpenEdit()}
              disabled={loadingDetails || Boolean(detailsError)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={14} />
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => setDelegatesOpen(true)}
              disabled={loadingDetails || Boolean(detailsError)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Users size={14} />
              Manage delegates
              {delegateCountBadge}
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Authentication</h2>
              <p className="text-xs text-slate-500">
                Strengthen access controls and review security policies.
              </p>
            </div>
          </header>
          <ul className="space-y-3 text-sm text-slate-600">
            {authentication.map((item) => (
              <li
                key={item.title}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (item.actionType === "password") {
                      setPasswordDialogOpen(true);
                    } else if (item.disabled) {
                      setComingSoonMessage("This feature is coming soon.");
                    }
                  }}
                  disabled={item.disabled}
                  className={`text-xs font-semibold ${
                    item.disabled
                      ? "text-slate-400 cursor-not-allowed"
                      : "text-primary hover:text-primary/80"
                  }`}
                >
                  {item.action}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Notification preferences
              </h2>
              <p className="text-xs text-slate-500">
                Choose how RentApplicaiton keeps you informed.
              </p>
            </div>
          </header>
          <ul className="space-y-3 text-sm text-slate-600">
            {notificationPrefs.map((item) => (
              <li
                key={item.channel}
                className="flex items-start justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.channel}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <span className="badge">{item.active ? "Enabled" : "Paused"}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setComingSoonMessage("Notification customization is coming soon.")}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Customize notification rules
          </button>
        </div>

        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Plug size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
              <p className="text-xs text-slate-500">
                Manage connected systems and data exports.
              </p>
            </div>
          </header>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-12 text-center">
            <Plug className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">No integrations</p>
            <p className="text-xs text-slate-500">
              Integrations will be available here in the future.
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <header className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <UploadCloud size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Data management & exports
            </h2>
            <p className="text-xs text-slate-500">
              Control how your data is stored, exported, and retained.
            </p>
          </div>
        </header>
        <div className="grid gap-3 text-sm text-slate-600 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
            <p className="font-semibold text-slate-900">Document retention</p>
            <p className="text-xs text-slate-500">
              Lease and inspection files retained for 7 years.
            </p>
            <button className="mt-3 text-xs font-semibold text-primary">
              Adjust policy
            </button>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
            <p className="font-semibold text-slate-900">Data export</p>
            <p className="text-xs text-slate-500">
              Schedule weekly CSV exports to finance@lagoonholdings.mv.
            </p>
            <button className="mt-3 text-xs font-semibold text-primary">
              Configure export
            </button>
          </div>
        </div>
      </section>

      {isEditing ? (
        <EditProfileDialog
          initialValues={details}
          onClose={handleCloseEdit}
          onSave={handleSaveProfile}
          activeField={activeField}
        />
      ) : null}

      {delegatesOpen ? (
        <DelegateManagerDialog
          roles={meta.roles}
          initialDelegates={delegateSeed}
          onClose={() => setDelegatesOpen(false)}
          onUpdated={handleDelegatesUpdated}
        />
      ) : null}

      {passwordDialogOpen ? (
        <UpdatePasswordDialog
          onClose={() => setPasswordDialogOpen(false)}
          onSave={async (values) => {
            const { message } = await updatePassword(values);
            setSuccessMessage(message);
            setPasswordDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, onEdit }) {
  const displayValue =
    typeof value === "string" && value.trim().length > 0 ? value : "—";

  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="text-sm font-semibold text-slate-900">{displayValue}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!onEdit}
      >
        Edit
      </button>
    </div>
  );
}

function EditProfileDialog({ initialValues, onClose, onSave, activeField }) {
  const [formValues, setFormValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const isMountedRef = useRef(true);

  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const focusField = useCallback((key) => {
    const lookup = {
      first_name: firstNameRef,
      last_name: lastNameRef,
      email: emailRef,
      mobile: phoneRef,
    };

    (lookup[key] ?? firstNameRef).current?.focus();
  }, []);

  useEffect(() => {
    setFormValues(initialValues);
    setFieldErrors({});
    setError(null);
  }, [initialValues]);

  useEffect(() => {
    if (!activeField || activeField === "full_name") {
      focusField("first_name");
      return;
    }

    focusField(activeField);
  }, [activeField, focusField]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors = {};

    if (!formValues.first_name?.trim()) {
      nextErrors.first_name = "First name is required.";
    }

    if (!formValues.last_name?.trim()) {
      nextErrors.last_name = "Last name is required.";
    }

    if (!formValues.email?.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(formValues.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!formValues.mobile?.trim()) {
      nextErrors.mobile = "Phone number is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const firstInvalidField = Object.keys(nextErrors)[0];
      focusField(firstInvalidField);
      setError("Please review the highlighted fields.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await Promise.resolve(onSave(formValues));
    } catch (submissionError) {
      if (submissionError instanceof ApiValidationError) {
        setFieldErrors(submissionError.errors ?? {});
        const firstInvalidField = Object.keys(submissionError.errors ?? {})[0];
        if (firstInvalidField) {
          focusField(firstInvalidField);
        }
        setError(submissionError.message);
      } else {
        setError(
          submissionError?.message ?? "We couldn't update the profile right now.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Profile
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Edit personal details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="profile-first-name"
            name="first_name"
            label="First name"
            placeholder="Lagoon"
            value={formValues.first_name}
            onChange={handleChange}
            ref={firstNameRef}
            error={fieldErrors.first_name}
          />
          <Field
            id="profile-last-name"
            name="last_name"
            label="Last name"
            placeholder="Holdings"
            value={formValues.last_name}
            onChange={handleChange}
            ref={lastNameRef}
            error={fieldErrors.last_name}
          />
          <Field
            id="profile-email"
            type="email"
            name="email"
            label="Email address"
            placeholder="you@company.mv"
            value={formValues.email}
            onChange={handleChange}
            ref={emailRef}
            error={fieldErrors.email}
          />
          <Field
            id="profile-phone"
            type="tel"
            name="mobile"
            label="Phone number"
            placeholder="+960 7XX-XXXX"
            value={formValues.mobile}
            onChange={handleChange}
            ref={phoneRef}
            error={fieldErrors.mobile}
          />


          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = forwardRef(function Field(
  { id, label, error, className = "", ...props },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        {...props}
        className={`w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});

Field.displayName = "Field";

function DelegateManagerDialog({ roles, onClose, onUpdated, initialDelegates }) {
  const initialDelegateList = useMemo(
    () => normalizeDelegatesList(initialDelegates),
    [initialDelegates],
  );

  const [delegates, setDelegates] = useState(initialDelegateList);
  const hasDelegatesRef = useRef(initialDelegateList.length > 0);
  const [loading, setLoading] = useState(initialDelegateList.length === 0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [formValues, setFormValues] = useState(() => buildEmptyDelegate(roles));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setDelegates(initialDelegateList);
    hasDelegatesRef.current = initialDelegateList.length > 0;
    setLoading(initialDelegateList.length === 0);
  }, [initialDelegateList]);

  useEffect(() => {
    hasDelegatesRef.current = delegates.length > 0;
  }, [delegates.length]);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  const fetchDelegates = useCallback(async (signal) => {
    if (!hasDelegatesRef.current) {
      setLoading(true);
    }
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to manage delegates.");
      }

      const response = await fetch(`${API_BASE_URL}/account/delegates`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal,
      });

      if (response.status === 204) {
        setDelegates([]);
        onUpdated?.(0);
        setLoading(false);
        return;
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ?? `Unable to load delegates (HTTP ${response.status}).`,
        );
      }

      const list = normalizeDelegatesList(payload);
      setDelegates(list);
      onUpdated?.(list.length);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message ?? "We could not load delegates.");
      setDelegates([]);
      onUpdated?.(0);
    } finally {
      setLoading(false);
    }
  }, [onUpdated]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDelegates(controller.signal);
    return () => controller.abort();
  }, [fetchDelegates]);

  const closeForm = () => {
    setFormMode(null);
    setFormValues(buildEmptyDelegate(roles));
    setFieldErrors({});
  };

  const openCreateForm = () => {
    setFormMode("create");
    setFormValues(buildEmptyDelegate(roles));
    setFieldErrors({});
  };

  const openEditForm = (delegate) => {
    setFormMode("edit");
    setFormValues({
      id: delegate.id,
      first_name: delegate.first_name ?? "",
      last_name: delegate.last_name ?? "",
      email: delegate.email ?? "",
      mobile: delegate.mobile ?? "",
      role: delegate.role ?? roles[0] ?? "manager",
      is_active: Boolean(delegate.is_active),
    });
    setFieldErrors({});
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFormValues((previous) => ({ ...previous, [name]: nextValue }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const submitDelegate = async (mode, payload, delegateId) => {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("You must be signed in to manage delegates.");

    const endpoint =
      mode === "edit"
        ? `${API_BASE_URL}/account/delegates/${delegateId}`
        : `${API_BASE_URL}/account/delegates`;

    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 422) {
      throw new ApiValidationError(
        data?.message ?? "Please review the highlighted fields.",
        data?.errors ?? {},
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ?? `Unable to save delegate (HTTP ${response.status}).`,
      );
    }

    return data;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const localErrors = {};
    if (!formValues.first_name?.trim()) localErrors.first_name = "First name is required.";
    if (!formValues.last_name?.trim()) localErrors.last_name = "Last name is required.";
    if (!formValues.email?.trim()) localErrors.email = "Email is required.";
    if (!formValues.mobile?.trim()) localErrors.mobile = "Phone number is required.";
    if (!formValues.role?.trim()) localErrors.role = "Role is required.";

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      first_name: formValues.first_name,
      last_name: formValues.last_name,
      email: formValues.email,
      mobile: formValues.mobile,
      role: formValues.role,
      is_active: Boolean(formValues.is_active),
    };

    try {
      const data = await submitDelegate(formMode, payload, formValues.id);
      const updatedDelegate = normalizeDelegateResource(data?.delegate);

      if (!updatedDelegate) {
        throw new Error("Delegate payload missing from server response.");
      }

      setDelegates((previous) => {
        const next =
          formMode === "edit"
            ? previous.map((item) => (item.id === updatedDelegate.id ? updatedDelegate : item))
            : [updatedDelegate, ...previous];

        onUpdated?.(next.length);
        return next;
      });

      setMessage(formMode === "edit" ? "Delegate updated successfully." : "Delegate created successfully.");
      closeForm();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.errors ?? {});
        setError(err.message);
      } else {
        setError(err.message ?? "We couldn't save the delegate right now.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (delegate) => {
    if (!delegate) return;

    const confirmed = window.confirm(
      `Remove ${delegate.full_name ?? delegate.email}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("You must be signed in before removing delegates.");
      return;
    }

    setDeletingId(delegate.id);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/account/delegates/${delegate.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ?? `Unable to remove delegate (HTTP ${response.status}).`,
        );
      }

      setDelegates((previous) => {
        const next = previous.filter((item) => item.id !== delegate.id);
        onUpdated?.(next.length);
        return next;
      });
      setMessage("Delegate removed.");
    } catch (err) {
      setError(err.message ?? "We could not remove that delegate.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Delegates
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Manage delegate access
            </h2>
            <p className="text-sm text-slate-500">
              Invite teammates to manage your portfolio and control their access.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {message ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {formMode ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  {formMode === "edit" ? "Edit delegate" : "Invite delegate"}
                </p>
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DelegateField
                  label="First name"
                  name="first_name"
                  value={formValues.first_name}
                  onChange={handleFormChange}
                  error={fieldErrors.first_name}
                />
                <DelegateField
                  label="Last name"
                  name="last_name"
                  value={formValues.last_name}
                  onChange={handleFormChange}
                  error={fieldErrors.last_name}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DelegateField
                  label="Email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleFormChange}
                  error={fieldErrors.email}
                />
                <DelegateField
                  label="Phone"
                  name="mobile"
                  value={formValues.mobile}
                  onChange={handleFormChange}
                  error={fieldErrors.mobile}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <DelegateField
                  as="select"
                  label="Role"
                  name="role"
                  value={formValues.role}
                  onChange={handleFormChange}
                  error={fieldErrors.role}
                  options={roles}
                />
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <input
                    id="delegate-active"
                    type="checkbox"
                    name="is_active"
                    checked={formValues.is_active}
                    onChange={handleFormChange}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  <label
                    htmlFor="delegate-active"
                    className="text-sm font-medium text-slate-600"
                  >
                    Active access
                  </label>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Save delegate
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
            >
              <Plus size={16} />
              Invite delegate
            </button>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && delegates.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading delegates…
              </div>
            ) : delegates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-slate-500">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="font-semibold text-slate-700">No delegates yet</p>
                <p className="text-xs text-slate-500">
                  Invite teammates to help manage maintenance, finance, and tenant workflows.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm text-slate-600">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-semibold">Name</th>
                      <th className="px-4 py-2 font-semibold">Email</th>
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Last login</th>
                      <th className="px-4 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delegates.map((delegate) => (
                      <tr key={delegate.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {delegate.full_name ||
                            [delegate.first_name, delegate.last_name]
                              .filter(Boolean)
                              .join(" ")}
                        </td>
                        <td className="px-4 py-3">{delegate.email}</td>
                        <td className="px-4 py-3 capitalize">{delegate.role}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              delegate.is_active
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {delegate.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {delegate.last_login_at
                            ? new Date(delegate.last_login_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(delegate)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(delegate)}
                              disabled={deletingId === delegate.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                            >
                              {deletingId === delegate.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildEmptyDelegate(roles) {
  return {
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    role: roles?.[0] ?? "manager",
    is_active: true,
  };
}

function DelegateField({
  as = "input",
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  options = [],
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {as === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      )}
      {error ? <p className="text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function normalizeDelegatesList(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (Array.isArray(input?.data)) {
    return input.data;
  }

  if (Array.isArray(input?.delegates)) {
    return input.delegates;
  }

  if (Array.isArray(input?.delegates?.data)) {
    return input.delegates.data;
  }

  return [];
}

function normalizeDelegateResource(resource) {
  if (!resource) {
    return null;
  }
  if (resource?.data) {
    return resource.data;
  }
  return resource;
}

function UpdatePasswordDialog({ onClose, onSave }) {
  const [formValues, setFormValues] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    try {
      await onSave(formValues);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.errors ?? {});
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("We couldn't update the password right now.");
      }
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Security
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Update password</h2>
            <p className="text-xs text-slate-500">
              Use at least 8 characters with a mix of symbols and numbers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
          >
            <X size={16} />
          </button>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="current-password"
            name="current_password"
            label="Current password"
            placeholder="Enter current password"
            value={formValues.current_password}
            onChange={handleChange}
            error={fieldErrors.current_password}
          />
          <PasswordField
            id="new-password"
            name="password"
            label="New password"
            placeholder="Enter new password"
            value={formValues.password}
            onChange={handleChange}
            error={fieldErrors.password}
          />
          <PasswordField
            id="confirm-password"
            name="password_confirmation"
            label="Confirm password"
            placeholder="Re-enter new password"
            value={formValues.password_confirmation}
            onChange={handleChange}
            error={fieldErrors.password_confirmation}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ id, label, error, className = "", ...props }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        {...props}
        className={`w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-500">
          {Array.isArray(error) ? error[0] : error}
        </p>
      ) : null}
    </div>
  );
}



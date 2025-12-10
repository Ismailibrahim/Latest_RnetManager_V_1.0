"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Users,
  Edit,
  Key,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { useAuth } from "@/contexts/AuthContext";

const roleOptions = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Agent", value: "agent" },
];

const initialFormState = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  role: "",
  isActive: true,
};

export default function EditOwnerPage({ params }) {
  const routeParams = use(params);
  const ownerId = routeParams?.id;
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [ownerLabel, setOwnerLabel] = useState("");
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  const [ownerData, setOwnerData] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ownerLandlordId, setOwnerLandlordId] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!ownerId) {
      return;
    }

    const controller = new AbortController();

    async function fetchOwner() {
      setLoading(true);
      setApiError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in before editing an owner.");
        }

        // Check if user is super admin
        let userRole = currentUser?.role;
        if (!userRole) {
          try {
            const cachedUser = localStorage.getItem("auth_user");
            if (cachedUser) {
              const userData = JSON.parse(cachedUser);
              userRole = userData?.role;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        const isSuperAdmin = userRole === "super_admin";
        const ownerIdNum = Number(ownerId);

        // For super admins, try fetching from admin endpoint first
        if (isSuperAdmin) {
          try {
            const adminResponse = await fetch(
              `${API_BASE_URL}/admin/owners?per_page=1000`,
              {
                signal: controller.signal,
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              const ownersList = Array.isArray(adminData?.data)
                ? adminData.data
                : [];
              const targetOwner = ownersList.find(
                (o) => Number(o.id) === ownerIdNum
              );

              if (targetOwner) {
                // Get current user's landlord_id to check if owner belongs to same company
                const accountCheckResponse = await fetch(`${API_BASE_URL}/account`, {
                  signal: controller.signal,
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                });

                let canEdit = false;
                if (accountCheckResponse.ok) {
                  const accountCheckData = await accountCheckResponse.json();
                  const currentUserData =
                    accountCheckData?.user ?? accountCheckData?.data?.user ?? null;
                  const currentUserLandlordId = currentUserData?.landlord_id;
                  const ownerLandlordId = targetOwner.landlord_id;

                  // Super admins can edit ANY owner, regardless of company
                  // Set up the form for editing
                  setIsPrimaryOwner(false);
                  setIsSuperAdmin(true);
                  setOwnerLandlordId(targetOwner.landlord_id);
                  setOwnerData(targetOwner);
                  setForm({
                    firstName: targetOwner.first_name ?? "",
                    lastName: targetOwner.last_name ?? "",
                    email: targetOwner.email ?? "",
                    mobile: targetOwner.mobile ?? "",
                    role: targetOwner.role ?? "",
                    isActive: targetOwner.is_active ?? true,
                  });

                  const fullName =
                    targetOwner.full_name ??
                    `${targetOwner.first_name || ""} ${targetOwner.last_name || ""}`.trim();
                  setOwnerLabel(
                    fullName || targetOwner.email || `Owner #${ownerId}`
                  );
                  setLoading(false);
                  return; // Success, exit early
                }
                // If account check fails or can't edit, fall through to regular flow
              }
            }
          } catch (adminError) {
            // If admin endpoint fails (including AbortError), fall through to regular flow
            // Don't log permission errors - they're expected when owner is from different company
            if (adminError.name !== "AbortError" && 
                !adminError.message?.includes("Super admins can only edit owners")) {
              console.warn("Admin endpoint failed, trying regular flow:", adminError);
            }
            // Silently fall through to regular flow which will handle the error appropriately
          }
        }

        // Regular flow: fetch account info to get current user and delegates
        const accountResponse = await fetch(`${API_BASE_URL}/account`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!accountResponse.ok) {
          const errorData = await accountResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Unable to load account information. (Status: ${accountResponse.status})`
          );
        }

        const accountData = await accountResponse.json();
        const currentUserData =
          accountData?.user ?? accountData?.data?.user ?? null;
        const delegatesList = Array.isArray(accountData?.delegates)
          ? accountData.delegates
          : [];

        // Find owner from delegates list

        // Check if editing primary owner (current user) or delegate
        const isPrimary =
          currentUserData && Number(currentUserData.id) === ownerIdNum;

        let targetOwner = null;
        if (isPrimary) {
          targetOwner = currentUserData;
          setIsPrimaryOwner(true);
          setIsSuperAdmin(false);
          setOwnerLandlordId(null);
        } else {
          targetOwner = delegatesList.find(
            (d) => Number(d.id) === ownerIdNum
          );
          setIsPrimaryOwner(false);
          setIsSuperAdmin(false);
          setOwnerLandlordId(null);
        }

        if (!targetOwner) {
          // Provide more helpful error message
          let errorMsg;
          if (isSuperAdmin) {
            errorMsg = `We couldn't find owner with ID ${ownerId} in your company. Super admins can only edit owners from their own company. If you need to edit owners from other companies, please contact support.`;
          } else {
            errorMsg = `We couldn't find owner with ID ${ownerId} in your company. Please make sure you're editing an owner from your own company.`;
          }
          throw new Error(errorMsg);
        }

        setOwnerData(targetOwner);
        setForm({
          firstName: targetOwner.first_name ?? "",
          lastName: targetOwner.last_name ?? "",
          email: targetOwner.email ?? "",
          mobile: targetOwner.mobile ?? "",
          role: targetOwner.role ?? "",
          isActive: targetOwner.is_active ?? true,
        });

        const fullName =
          targetOwner.full_name ??
          `${targetOwner.first_name || ""} ${targetOwner.last_name || ""}`.trim();
        setOwnerLabel(fullName || targetOwner.email || `Owner #${ownerId}`);
      } catch (error) {
        if (error.name !== "AbortError") {
          setApiError(error.message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchOwner();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]); // Only depend on ownerId, currentUser is checked inside

  const fieldKeyMap = {
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    mobile: "mobile",
    role: "role",
    isActive: "is_active",
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setValidationErrors((prev) => {
      if (!prev) {
        return prev;
      }

      const next = { ...prev };
      const apiKey = fieldKeyMap[name] ?? name;
      delete next[apiKey];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setApiError(null);
    setSuccess(false);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before editing an owner.");
      }

      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
      };

      // For delegates, include role and is_active
      if (!isPrimaryOwner) {
        payload.role = form.role;
        payload.is_active = form.isActive;
      }

      // Additional validation: Ensure owner exists and belongs to user's company
      // Skip this check for super admins (they can edit any owner)
      if (!isPrimaryOwner && !isSuperAdmin) {
        // Verify the delegate exists in the user's company before attempting update
        const verifyResponse = await fetch(`${API_BASE_URL}/account`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const currentUserData =
            verifyData?.user ?? verifyData?.data?.user ?? null;
          const delegatesList = Array.isArray(verifyData?.delegates)
            ? verifyData.delegates
            : [];

          // Check if the owner exists in delegates list
          const ownerExists = delegatesList.some(
            (d) => Number(d.id) === Number(ownerId)
          );

          // Also check if it's the current user
          const isCurrentUser =
            currentUserData && Number(currentUserData.id) === Number(ownerId);

          if (!ownerExists && !isCurrentUser) {
            throw new Error(
              "The owner you're trying to edit doesn't exist in your company or you don't have permission to edit them. Please make sure you're editing an owner from your own company."
            );
          }
        } else {
          // If we can't verify, don't proceed with the update to prevent 500 errors
          throw new Error(
            "Unable to verify ownership. Please refresh the page and try again."
          );
        }
      }

      // Determine the API endpoint
      // Super admins use admin endpoint to edit any owner
      let endpoint;
      if (isSuperAdmin && !isPrimaryOwner) {
        endpoint = `${API_BASE_URL}/admin/owners/${ownerId}`;
      } else if (isPrimaryOwner) {
        endpoint = `${API_BASE_URL}/account`;
      } else {
        endpoint = `${API_BASE_URL}/account/delegates/${ownerId}`;
      }

      const method = "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const payload = await response.json();
        setValidationErrors(payload.errors ?? {});
        throw new Error(payload.message ?? "Validation error.");
      }

      if (response.status === 403) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ??
            "You don't have permission to edit this owner. Owners can only be edited by users from the same company."
        );
      }

      if (response.status === 404) {
        throw new Error(
          "The owner you're trying to edit doesn't exist or has been deleted."
        );
      }

      if (response.status === 500) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ??
            "A server error occurred while updating the owner. Please try again or contact support if the problem persists."
        );
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Could not update owner (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/owners");
        router.refresh();
      }, 1000);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setResettingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before resetting a password.");
      }

      // Validate passwords match
      if (passwordForm.password !== passwordForm.password_confirmation) {
        throw new Error("Passwords do not match.");
      }

      if (passwordForm.password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      // Determine the API endpoint
      const endpoint = isSuperAdmin
        ? `${API_BASE_URL}/admin/owners/${ownerId}/password`
        : `${API_BASE_URL}/account/delegates/${ownerId}/password`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: passwordForm.password,
          password_confirmation: passwordForm.password_confirmation,
        }),
      });

      // Try to get response body
      let responseData;
      const contentType = response.headers.get("content-type");
      
      try {
        const text = await response.text();
        
        if (contentType && contentType.includes("application/json")) {
          responseData = JSON.parse(text);
        } else {
          responseData = { message: text || `HTTP ${response.status} ${response.statusText}` };
        }
        
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error(
          `Server returned invalid response (HTTP ${response.status}). Please check the console for details.`
        );
      }

      if (response.status === 422) {
        const errors = responseData.errors ?? {};
        const errorMessages = Object.values(errors).flat();
        throw new Error(
          errorMessages[0] || responseData.message || "Validation error."
        );
      }

      if (response.status === 429) {
        // Rate limit exceeded
        throw new Error(
          responseData?.message ??
            "Too many password reset attempts. Please wait a minute and try again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          responseData?.message ??
            "You don't have permission to reset this owner's password."
        );
      }

      if (response.status === 404) {
        throw new Error(
          responseData?.message ??
            "The owner you're trying to reset password for doesn't exist."
        );
      }

      if (response.status === 500) {
        // Check if it's actually a rate limit error
        if (responseData?.error?.includes("Too Many Attempts") || responseData?.message?.includes("Too Many Attempts")) {
          throw new Error(
            "Too many password reset attempts. Please wait a minute and try again."
          );
        }
        throw new Error(
          responseData?.message ??
            "A server error occurred while resetting the password. Please try again or contact support."
        );
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ??
            `Could not reset password (HTTP ${response.status}).`
        );
      }

      setPasswordSuccess(true);
      setPasswordForm({ password: "", password_confirmation: "" });

      // Hide the form after 3 seconds
      setTimeout(() => {
        setShowPasswordReset(false);
        setPasswordSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      setPasswordError(
        error.message || "An error occurred processing your request."
      );
    } finally {
      setResettingPassword(false);
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
          <span className="sr-only">Back to owners</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Edit size={24} className="text-primary" />
            Edit owner
          </h1>
          <p className="text-sm text-slate-600">
            Update owner details for{" "}
            <span className="font-semibold text-slate-900">
              {ownerLabel || "this owner"}
            </span>
            .
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-600">
              Fetching owner details…
            </p>
          </div>
        ) : (
          <>
            {apiError && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>{apiError}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                <p>Owner updated successfully.</p>
              </div>
            )}

            {isPrimaryOwner && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>
                  You are editing your own account. Role and active status cannot
                  be changed here.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Fieldset>
                  <Label htmlFor="firstName">
                    First name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="Aisha"
                    value={form.firstName}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                    aria-required="true"
                    aria-describedby={
                      validationErrors.first_name ? "first-name-error" : undefined
                    }
                  />
                  {validationErrors.first_name && (
                    <FieldError id="first-name-error">
                      {validationErrors.first_name[0]}
                    </FieldError>
                  )}
                </Fieldset>

                <Fieldset>
                  <Label htmlFor="lastName">
                    Last name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Ibrahim"
                    value={form.lastName}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                    aria-required="true"
                    aria-describedby={
                      validationErrors.last_name ? "last-name-error" : undefined
                    }
                  />
                  {validationErrors.last_name && (
                    <FieldError id="last-name-error">
                      {validationErrors.last_name[0]}
                    </FieldError>
                  )}
                </Fieldset>
              </div>

              <Fieldset>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="owner@example.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                  aria-required="true"
                  aria-describedby={
                    validationErrors.email ? "email-error" : undefined
                  }
                />
                {validationErrors.email && (
                  <FieldError id="email-error">
                    {validationErrors.email[0]}
                  </FieldError>
                )}
              </Fieldset>

              <Fieldset>
                <Label htmlFor="mobile">
                  Mobile <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="+960 7XXXXXX"
                  value={form.mobile}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                  aria-required="true"
                  aria-describedby={
                    validationErrors.mobile ? "mobile-error" : undefined
                  }
                />
                {validationErrors.mobile && (
                  <FieldError id="mobile-error">
                    {validationErrors.mobile[0]}
                  </FieldError>
                )}
              </Fieldset>

              {!isPrimaryOwner && (
                <>
                  <Fieldset>
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-describedby={
                        validationErrors.role ? "role-error" : undefined
                      }
                    >
                      <option value="">Select role…</option>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {validationErrors.role && (
                      <FieldError id="role-error">
                        {validationErrors.role[0]}
                      </FieldError>
                    )}
                  </Fieldset>

                  <Fieldset>
                    <div className="flex items-center gap-3">
                      <input
                        id="isActive"
                        name="isActive"
                        type="checkbox"
                        checked={form.isActive}
                        onChange={handleChange}
                        disabled={submitting}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Label htmlFor="isActive" className="!mb-0 cursor-pointer">
                        Active account
                      </Label>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Inactive accounts cannot log in to the system.
                    </p>
                    {validationErrors.is_active && (
                      <FieldError id="is-active-error">
                        {validationErrors.is_active[0]}
                      </FieldError>
                    )}
                  </Fieldset>
                </>
              )}

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
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Password Reset Section - Only for non-primary owners */}
            {!isPrimaryOwner && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Reset Password
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Reset the password for this owner. They will need to log in
                      again with the new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordReset(!showPasswordReset);
                      setPasswordError(null);
                      setPasswordSuccess(false);
                      setPasswordForm({ password: "", password_confirmation: "" });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <Key size={16} />
                    {showPasswordReset ? "Cancel" : "Reset Password"}
                  </button>
                </div>

                {showPasswordReset && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <form
                      onSubmit={handlePasswordReset}
                      className="space-y-4"
                    >
                      <Fieldset>
                        <Label htmlFor="password">
                          New Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter new password"
                          value={passwordForm.password}
                          onChange={(e) => {
                            setPasswordForm({
                              ...passwordForm,
                              password: e.target.value,
                            });
                            setPasswordError(null);
                          }}
                          disabled={resettingPassword}
                          required
                          aria-required="true"
                        />
                      </Fieldset>

                      <Fieldset>
                        <Label htmlFor="password_confirmation">
                          Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="password_confirmation"
                          name="password_confirmation"
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordForm.password_confirmation}
                          onChange={(e) => {
                            setPasswordForm({
                              ...passwordForm,
                              password_confirmation: e.target.value,
                            });
                            setPasswordError(null);
                          }}
                          disabled={resettingPassword}
                          required
                          aria-required="true"
                        />
                      </Fieldset>

                      {passwordError && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
                          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                          <p>{passwordError}</p>
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-700">
                          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                          <p>Password reset successfully. The owner will need to log in again.</p>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordReset(false);
                            setPasswordError(null);
                            setPasswordSuccess(false);
                            setPasswordForm({ password: "", password_confirmation: "" });
                          }}
                          disabled={resettingPassword}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={resettingPassword}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                        >
                          {resettingPassword ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Resetting…
                            </>
                          ) : (
                            <>
                              <Key size={16} />
                              Reset Password
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, className = "", ...props }) {
  return (
    <label
      {...props}
      className={`text-sm font-semibold text-slate-700 ${className}`}
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


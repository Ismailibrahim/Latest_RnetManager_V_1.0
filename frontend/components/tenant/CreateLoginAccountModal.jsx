"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Mail,
  Lock,
  Key,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { getApiErrorMessage } from "@/utils/api-errors";

export function CreateLoginAccountModal({
  tenant,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [passwordOption, setPasswordOption] = useState("auto"); // "auto" or "custom"
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setPasswordOption("auto");
      setCustomPassword("");
      setShowPassword(false);
      setError(null);
      setSuccess(false);
      setGeneratedPassword(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !tenant) {
    return null;
  }

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in to create a login account.");
      }

      // Validate custom password if selected
      if (passwordOption === "custom") {
        if (!customPassword || customPassword.length < 8) {
          setError("Password must be at least 8 characters long.");
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        auto_generate_password: passwordOption === "auto",
      };

      if (passwordOption === "custom" && customPassword) {
        payload.password = customPassword;
      }

      const response = await fetch(
        `${API_BASE_URL}/tenants/${tenant.id}/create-user-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = getApiErrorMessage(
          payload,
          `Failed to create login account (HTTP ${response.status})`
        );
        throw new Error(message);
      }

      const responseData = await response.json();

      // Show success with password if auto-generated
      if (responseData?.data?.auto_generated && responseData?.data?.password) {
        setGeneratedPassword(responseData.data.password);
        setSuccess(true);
      } else {
        // Success but no password to show (custom password was set)
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const tenantName = tenant?.full_name ?? `Tenant #${tenant?.id}`;
  const tenantEmail = tenant?.email ?? "No email provided";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create Login Account
            </h2>
            <p className="mt-1 text-sm text-slate-500">{tenantName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && !generatedPassword && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
              <p>Login account created successfully!</p>
            </div>
          )}

          {success && generatedPassword ? (
            /* Success State - Show Generated Password */
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <CheckCircle2 size={24} className="text-green-600" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">
                    Login account created successfully!
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    Please share these credentials with the tenant securely.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">
                      {tenantEmail}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <Key size={16} className="text-slate-400" />
                      <code className="flex-1 font-mono text-sm font-semibold text-slate-900">
                        {generatedPassword}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={16} className="text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-amber-600">
                    ⚠️ Save this password now. You won't be able to see it again.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="mt-0.5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Email Address
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{tenantEmail}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      The tenant will use this email to log in to their account.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-900">
                  Password Option
                </label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-primary/50 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="passwordOption"
                      value="auto"
                      checked={passwordOption === "auto"}
                      onChange={(e) => setPasswordOption(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-slate-400" />
                        <span className="font-medium text-slate-900">
                          Generate password automatically
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        A secure 12-character password will be generated and
                        displayed after creation.
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-primary/50 hover:bg-slate-50">
                    <input
                      type="radio"
                      name="passwordOption"
                      value="custom"
                      checked={passwordOption === "custom"}
                      onChange={(e) => setPasswordOption(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Lock size={16} className="text-slate-400" />
                        <span className="font-medium text-slate-900">
                          Set custom password
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Create a custom password for the tenant (minimum 8
                        characters).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {passwordOption === "custom" && (
                <div>
                  <label
                    htmlFor="customPassword"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="customPassword"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Enter password (min 8 characters)"
                      minLength={8}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Minimum 8 characters. The tenant will receive this password
                    via email.
                  </p>
                  {customPassword && customPassword.length < 8 && (
                    <p className="mt-1 text-xs text-red-600">
                      Password must be at least 8 characters long.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (passwordOption === "custom" &&
                      (!customPassword || customPassword.length < 8))
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


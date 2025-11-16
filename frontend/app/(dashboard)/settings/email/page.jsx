"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  Send,
  Settings2,
} from "lucide-react";
import { useEmailSettings } from "@/hooks/useEmailSettings";

export default function EmailSettingsPage() {
  const { settings, loading, error, updateSettings, testEmail, refetch } =
    useEmailSettings();
  const [formData, setFormData] = useState({
    provider: "gmail",
    enabled: false,
    from_name: "",
    from_address: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_encryption: "tls",
    smtp_username: "",
    smtp_password: "",
    notifications: {
      rent_due: { enabled: false, template_id: null },
      rent_received: { enabled: false, template_id: null },
      maintenance_request: { enabled: false, template_id: null },
      lease_expiry: { enabled: false, template_id: null },
      security_deposit: { enabled: false, template_id: null },
    },
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setFormData({
        provider: settings.provider || "gmail",
        enabled: settings.enabled || false,
        from_name: settings.from_name || "",
        from_address: settings.from_address || "",
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port || 587,
        smtp_encryption: settings.smtp_encryption || "tls",
        smtp_username: settings.smtp_username || "",
        smtp_password: "", // Don't populate password field
        notifications: settings.notifications || {
          rent_due: { enabled: false, template_id: null },
          rent_received: { enabled: false, template_id: null },
          maintenance_request: { enabled: false, template_id: null },
          lease_expiry: { enabled: false, template_id: null },
          security_deposit: { enabled: false, template_id: null },
        },
      });
    }
  }, [settings]);

  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timeout = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timeout);
    }
  }, [errorMessage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("notifications.")) {
      const parts = name.split(".");
      setFormData((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [parts[1]]: {
            ...prev.notifications[parts[1]],
            [parts[2]]: type === "checkbox" ? checked : value,
          },
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Prepare data - only include password if it was changed
      const updateData = { ...formData };
      if (!updateData.smtp_password) {
        delete updateData.smtp_password;
      }

      await updateSettings(updateData);
      setSuccessMessage("Email settings updated successfully.");
      await refetch();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update email settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      setErrorMessage("Please enter an email address to test.");
      return;
    }

    setTesting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await testEmail(testEmailAddress);
      setSuccessMessage(`Test email sent successfully to ${testEmailAddress}`);
      setTestEmailAddress("");
    } catch (err) {
      setErrorMessage(err.message || "Failed to send test email.");
    } finally {
      setTesting(false);
    }
  };

  const getDefaultSmtpHost = (provider) => {
    return provider === "office365" ? "smtp.office365.com" : "smtp.gmail.com";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading email settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6">
        <div className="space-y-2">
          <div className="badge">
            <Mail size={14} />
            Email Configuration
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Email Notifications
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Configure email provider settings to send notifications to customers.
            Support for Gmail and Office 365.
          </p>
        </div>
      </section>

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

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50/80 px-4 py-3 text-sm text-green-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">
              Provider Settings
            </h2>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="enabled"
                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <input
                  type="checkbox"
                  id="enabled"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                Enable Email Notifications
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Turn on email notifications for your account
              </p>
            </div>

            <div>
              <label
                htmlFor="provider"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Email Provider
              </label>
              <select
                id="provider"
                name="provider"
                value={formData.provider}
                onChange={(e) => {
                  handleChange(e);
                  // Update SMTP host when provider changes
                  setFormData((prev) => ({
                    ...prev,
                    provider: e.target.value,
                    smtp_host: getDefaultSmtpHost(e.target.value),
                  }));
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="gmail">Gmail</option>
                <option value="office365">Office 365</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="from_name"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                From Name
              </label>
              <input
                type="text"
                id="from_name"
                name="from_name"
                value={formData.from_name}
                onChange={handleChange}
                placeholder="Your Company Name"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="from_address"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                From Email Address
              </label>
              <input
                type="email"
                id="from_address"
                name="from_address"
                value={formData.from_address}
                onChange={handleChange}
                placeholder="noreply@example.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">
              SMTP Configuration
            </h2>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="smtp_host"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                SMTP Host
              </label>
              <input
                type="text"
                id="smtp_host"
                name="smtp_host"
                value={formData.smtp_host || getDefaultSmtpHost(formData.provider)}
                onChange={handleChange}
                placeholder={getDefaultSmtpHost(formData.provider)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="smtp_port"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                SMTP Port
              </label>
              <input
                type="number"
                id="smtp_port"
                name="smtp_port"
                value={formData.smtp_port}
                onChange={handleChange}
                min="1"
                max="65535"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="smtp_encryption"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Encryption
              </label>
              <select
                id="smtp_encryption"
                name="smtp_encryption"
                value={formData.smtp_encryption}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="smtp_username"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                SMTP Username
              </label>
              <input
                type="text"
                id="smtp_username"
                name="smtp_username"
                value={formData.smtp_username}
                onChange={handleChange}
                placeholder="your-email@example.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="smtp_password"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                SMTP Password / App Password
              </label>
              <input
                type="password"
                id="smtp_password"
                name="smtp_password"
                value={formData.smtp_password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                For Gmail, use an App Password. For Office 365, use your account
                password or App Password.
              </p>
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">
              Notification Types
            </h2>
          </header>

          <div className="space-y-4">
            {Object.entries(formData.notifications).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
              >
                <div>
                  <label
                    htmlFor={`notifications.${key}.enabled`}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      id={`notifications.${key}.enabled`}
                      name={`notifications.${key}.enabled`}
                      checked={value.enabled}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    {key
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">
              Test Email
            </h2>
          </header>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="test_email"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Test Email Address
              </label>
              <input
                type="email"
                id="test_email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="test@example.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testing || !formData.enabled}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


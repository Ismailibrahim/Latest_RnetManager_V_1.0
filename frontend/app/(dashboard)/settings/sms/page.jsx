"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useSmsSettings } from "@/hooks/useSmsSettings";

export default function SmsSettingsPage() {
  const { settings, loading, error, updateSettings, testSms, refetch } =
    useSmsSettings();
  const [formData, setFormData] = useState({
    provider: "msgowl",
    enabled: false,
        api_key: "",
        sender_id: "", // Start empty - user must enter their approved sender ID
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
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (settings) {
      // Filter out invalid default sender IDs (MSGOWL, MessageOwl, etc.)
      let senderId = settings.sender_id || "";
      const invalidDefaults = ["MSGOWL", "MESSAGEOWL", "MessageOwl", "messageowl"];
      if (invalidDefaults.includes(senderId.toUpperCase()) || invalidDefaults.includes(senderId)) {
        senderId = ""; // Clear invalid defaults
      }

      setFormData({
        provider: settings.provider || "msgowl",
        enabled: settings.enabled || false,
        api_key: "", // Don't populate API key field
        sender_id: senderId,
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
      // Prepare data - only include API key if it was changed
      const updateData = { ...formData };
      if (!updateData.api_key) {
        delete updateData.api_key;
      }

      await updateSettings(updateData);
      setSuccessMessage("SMS settings updated successfully.");
      await refetch();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update SMS settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhoneNumber) {
      setErrorMessage("Please enter a phone number to test.");
      return;
    }

    if (!formData.sender_id || formData.sender_id.trim() === "") {
      setErrorMessage("Please enter your approved sender ID before testing.");
      return;
    }

    setTesting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await testSms(testPhoneNumber);
      setSuccessMessage(`Test SMS sent successfully to ${testPhoneNumber}`);
      setTestPhoneNumber("");
    } catch (err) {
      setErrorMessage(err.message || "Failed to send test SMS.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading SMS settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="badge">
              <MessageSquare size={14} />
              SMS Configuration
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              SMS Notifications
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Configure Message Owl SMS provider settings to send notifications to customers.
            </p>
          </div>
          <Link
            href="/settings/sms/templates"
            className="flex items-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            <FileText size={16} />
            Manage Templates
          </Link>
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
                Enable SMS Notifications
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Turn on SMS notifications for your account
              </p>
            </div>

            <div>
              <label
                htmlFor="sender_id"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Sender ID <span className="text-red-500">*</span>
              </label>
              {settings?.approved_sender_ids && settings.approved_sender_ids.length > 0 ? (
                <select
                  id="sender_id"
                  name="sender_id"
                  value={formData.sender_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Select your approved sender ID --</option>
                  {settings.approved_sender_ids.map((senderId) => (
                    <option key={senderId} value={senderId}>
                      {senderId}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="sender_id"
                  name="sender_id"
                  value={formData.sender_id}
                  onChange={handleChange}
                  placeholder="Enter your approved sender ID (e.g., YourCompany)"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              )}
              <p className="mt-1 text-xs text-slate-500">
                {settings?.approved_sender_ids && settings.approved_sender_ids.length > 0
                  ? `Select your approved sender ID from the dropdown above. ${settings.approved_sender_ids.length} approved sender ID(s) found in your Message Owl account.`
                  : "Enter your approved sender ID from your Message Owl account. This is the name that will appear as the sender on SMS messages. If you don't see approved sender IDs in the dropdown, enter your existing approved sender ID manually."}
              </p>
              {!formData.sender_id && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  ⚠️ Sender ID is required. Please enter your approved sender ID from your Message Owl account.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="api_key"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Message Owl API Key
              </label>
              {settings?.api_key_source === "environment" && (
                <div className="mb-2 rounded-lg border border-green-200 bg-green-50/80 px-3 py-2">
                  <p className="text-xs text-green-700 font-semibold">
                    ✓ Using API key from environment variable (MSG_OWL_KEY)
                  </p>
                  <p className="mt-0.5 text-xs text-green-600">
                    Optional: Enter a key below to override the environment variable
                  </p>
                </div>
              )}
              <input
                type="password"
                id="api_key"
                name="api_key"
                value={formData.api_key}
                onChange={handleChange}
                placeholder={
                  settings?.api_key_source === "environment"
                    ? "Leave blank to use MSG_OWL_KEY from .env"
                    : "Leave blank to keep current API key"
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                Your Message Owl API access key. Keep this secure and never share it.
                {settings?.api_key_source === "settings" && (
                  <span className="ml-1 text-green-600">(Currently configured in settings)</span>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
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
              Test SMS
            </h2>
          </header>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="test_phone"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Test Phone Number
              </label>
              <input
                type="tel"
                id="test_phone"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+9601234567"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestSms}
                disabled={testing || !formData.enabled || !settings?.api_key_configured}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !formData.enabled
                    ? "Enable SMS notifications first"
                    : !settings?.api_key_configured
                    ? "API key not configured"
                    : ""
                }
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


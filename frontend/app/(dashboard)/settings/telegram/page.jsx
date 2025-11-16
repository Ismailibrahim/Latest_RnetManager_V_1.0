"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  Save,
  Settings2,
  MessageCircle,
} from "lucide-react";
import { useTelegramSettings } from "@/hooks/useTelegramSettings";

export default function TelegramSettingsPage() {
  const { settings, loading, error, updateSettings, testTelegram, refetch } =
    useTelegramSettings();
  const [formData, setFormData] = useState({
    enabled: false,
    bot_token: "",
    chat_id: "",
    parse_mode: "None",
    notifications: {
      rent_due: { enabled: false, template_id: null },
      rent_received: { enabled: false, template_id: null },
      maintenance_request: { enabled: false, template_id: null },
      lease_expiry: { enabled: false, template_id: null },
      security_deposit: { enabled: false, template_id: null },
      system: { enabled: false, template_id: null },
    },
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testChatId, setTestChatId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setFormData({
        enabled: settings.enabled || false,
        bot_token: "", // Don't populate bot token field
        chat_id: settings.chat_id || "",
        parse_mode: settings.parse_mode || "None",
        notifications: settings.notifications || {
          rent_due: { enabled: false, template_id: null },
          rent_received: { enabled: false, template_id: null },
          maintenance_request: { enabled: false, template_id: null },
          lease_expiry: { enabled: false, template_id: null },
          security_deposit: { enabled: false, template_id: null },
          system: { enabled: false, template_id: null },
        },
      });
      // Set test chat ID to default chat ID if available
      if (settings.chat_id) {
        setTestChatId(settings.chat_id);
      }
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
      // Prepare data - only include bot token if it was changed
      const updateData = { ...formData };
      if (!updateData.bot_token) {
        delete updateData.bot_token;
      }

      await updateSettings(updateData);
      setSuccessMessage("Telegram settings updated successfully.");
      await refetch();
    } catch (err) {
      setErrorMessage(err.message || "Failed to update Telegram settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!testChatId) {
      setErrorMessage("Please enter a chat ID to test.");
      return;
    }

    setTesting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await testTelegram(testChatId);
      setSuccessMessage(`Test Telegram message sent successfully to chat ID ${testChatId}`);
      setTestChatId("");
    } catch (err) {
      setErrorMessage(err.message || "Failed to send test Telegram message.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Telegram settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6">
        <div className="space-y-2">
          <div className="badge">
            <MessageCircle size={14} />
            Telegram Configuration
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Telegram Notifications
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Configure Telegram Bot API settings to send notifications to your Telegram chat.
            You'll need to create a bot via BotFather and get your chat ID.
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
                Enable Telegram Notifications
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Turn on Telegram notifications for your account
              </p>
            </div>

            <div>
              <label
                htmlFor="parse_mode"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Message Format
              </label>
              <select
                id="parse_mode"
                name="parse_mode"
                value={formData.parse_mode}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="None">Plain Text</option>
                <option value="Markdown">Markdown</option>
                <option value="HTML">HTML</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Choose how messages should be formatted
              </p>
            </div>

            <div>
              <label
                htmlFor="chat_id"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Default Chat ID
              </label>
              <input
                type="text"
                id="chat_id"
                name="chat_id"
                value={formData.chat_id}
                onChange={handleChange}
                placeholder="123456789"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                Your Telegram chat ID. Start a chat with your bot and use getUpdates API to find your chat ID.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="bot_token"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Telegram Bot Token
              </label>
              {settings?.bot_token_source === "environment" && (
                <div className="mb-2 rounded-lg border border-green-200 bg-green-50/80 px-3 py-2">
                  <p className="text-xs text-green-700 font-semibold">
                    ✓ Using bot token from environment variable (TELEGRAM_BOT_TOKEN)
                  </p>
                  <p className="mt-0.5 text-xs text-green-600">
                    Optional: Enter a token below to override the environment variable
                  </p>
                </div>
              )}
              <input
                type="password"
                id="bot_token"
                name="bot_token"
                value={formData.bot_token}
                onChange={handleChange}
                placeholder={
                  settings?.bot_token_source === "environment"
                    ? "Leave blank to use TELEGRAM_BOT_TOKEN from .env"
                    : "Leave blank to keep current bot token"
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                Your Telegram bot token from BotFather. Keep this secure and never share it.
                {settings?.bot_token_source === "settings" && (
                  <span className="ml-1 text-green-600">(Currently configured in settings)</span>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="card space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
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
              Test Telegram
            </h2>
          </header>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="test_chat_id"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Test Chat ID
              </label>
              <input
                type="text"
                id="test_chat_id"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="123456789"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testing || !formData.enabled || !settings?.bot_token_configured}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !formData.enabled
                    ? "Enable Telegram notifications first"
                    : !settings?.bot_token_configured
                    ? "Bot token not configured"
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


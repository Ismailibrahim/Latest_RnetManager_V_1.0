"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

const TIER_OPTIONS = [
  { value: "basic", label: "Basic", price: 0 },
  { value: "pro", label: "Pro", price: 999 },
  { value: "enterprise", label: "Enterprise", price: 4999 },
];

export function UpdateSubscriptionModal({ landlord, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    subscription_tier: landlord?.subscription_tier || "basic",
    subscription_expires_at: landlord?.subscription_expires_at || "",
    subscription_started_at: landlord?.subscription_started_at || "",
    subscription_auto_renew: landlord?.subscription_auto_renew || false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (landlord) {
      setFormData({
        subscription_tier: landlord.subscription_tier || "basic",
        subscription_expires_at: landlord.subscription_expires_at || "",
        subscription_started_at: landlord.subscription_started_at || "",
        subscription_auto_renew: landlord.subscription_auto_renew || false,
      });
    }
  }, [landlord]);

  const selectedTier = TIER_OPTIONS.find((t) => t.value === formData.subscription_tier);
  const currentTierLimit = landlord?.subscription_limit;
  const isBasicTier = formData.subscription_tier === "basic";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        subscription_tier: formData.subscription_tier,
        subscription_auto_renew: formData.subscription_auto_renew,
      };

      // Only include expiry date if not basic tier
      if (!isBasicTier && formData.subscription_expires_at) {
        payload.subscription_expires_at = formData.subscription_expires_at;
      }

      if (formData.subscription_started_at) {
        payload.subscription_started_at = formData.subscription_started_at;
      }

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlord.id}/subscription`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to update subscription");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Update Subscription
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {landlord?.company_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Status */}
            {landlord && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Current Status
                </p>
                <SubscriptionStatusBadge
                  status={landlord.subscription_status}
                  daysUntilExpiry={landlord.days_until_expiry}
                />
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Current Tier</p>
                    <p className="font-semibold text-slate-900">
                      {landlord.subscription_tier?.toUpperCase() || "N/A"}
                    </p>
                  </div>
                  {landlord.subscription_expires_at && (
                    <div>
                      <p className="text-xs text-slate-500">Expires</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(landlord.subscription_expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subscription Tier */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Subscription Tier <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.subscription_tier}
                onChange={(e) =>
                  setFormData({ ...formData, subscription_tier: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {TIER_OPTIONS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label} - MVR {tier.price.toLocaleString()}/month
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Limits Comparison */}
            {currentTierLimit && selectedTier && (
              <div className="rounded-lg border border-slate-200 bg-blue-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  {selectedTier.label} Plan Limits
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Properties</p>
                    <p className="font-semibold text-slate-900">
                      {currentTierLimit.max_properties || "Unlimited"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Units</p>
                    <p className="font-semibold text-slate-900">
                      {currentTierLimit.max_units || "Unlimited"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Users</p>
                    <p className="font-semibold text-slate-900">
                      {currentTierLimit.max_users || "Unlimited"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expiry Date */}
            {!isBasicTier && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.subscription_expires_at}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription_expires_at: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Leave empty to set expiry based on tier (1 month from start)
                </p>
              </div>
            )}

            {/* Started Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Subscription Started Date
              </label>
              <input
                type="date"
                value={formData.subscription_started_at}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subscription_started_at: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Auto Renew */}
            {!isBasicTier && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  id="auto_renew"
                  checked={formData.subscription_auto_renew}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription_auto_renew: e.target.checked,
                    })
                  }
                  className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <label
                    htmlFor="auto_renew"
                    className="text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    Auto-renew subscription
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    Automatically extend subscription when it expires
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


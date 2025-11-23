"use client";

import { useState } from "react";
import { X, AlertCircle, Calendar } from "lucide-react";

export function ExtendSubscriptionModal({ landlord, onClose, onSuccess }) {
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const calculateNewExpiry = () => {
    if (!landlord?.subscription_expires_at) {
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + months);
      return newDate.toISOString().split("T")[0];
    }

    const currentExpiry = new Date(landlord.subscription_expires_at);
    const newDate = new Date(currentExpiry);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlord.id}/subscription/extend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ months }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to extend subscription");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const newExpiryDate = calculateNewExpiry();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Extend Subscription
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Expiry */}
          {landlord?.subscription_expires_at && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Current Expiry
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(landlord.subscription_expires_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Months Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Extend by (months) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* New Expiry Preview */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                New Expiry Date
              </p>
            </div>
            <p className="text-lg font-semibold text-blue-900">
              {new Date(newExpiryDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
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
              {submitting ? "Extending..." : "Extend Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


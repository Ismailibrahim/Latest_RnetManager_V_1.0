"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText, Loader2, AlertCircle } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function EndLeaseModal({ lease, isOpen, onClose, onSuccess }) {
  const [moveOutDate, setMoveOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Set default move-out date to today
      const today = new Date().toISOString().split("T")[0];
      setMoveOutDate(today);
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !lease) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in to end the lease.");
      }

      const payload = {
        move_out_date: moveOutDate || new Date().toISOString().split("T")[0],
        notes: notes.trim() || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/tenant-units/${lease.id}/end-lease`,
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
        const message =
          payload?.message ??
          payload?.error ??
          `Failed to end lease (HTTP ${response.status})`;
        throw new Error(message);
      }

      // Success - close modal and refresh
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tenantName = lease?.tenant?.full_name ?? `Tenant #${lease?.tenant_id}`;
  const unitNumber = lease?.unit?.unit_number ?? `Unit #${lease?.unit_id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">End Lease</h2>
            <p className="mt-1 text-sm text-slate-500">
              {tenantName} · {unitNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Move-out Date */}
            <div>
              <label
                htmlFor="move_out_date"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <Calendar size={16} className="text-slate-400" />
                Move-out Date
              </label>
              <input
                type="date"
                id="move_out_date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                The date when the tenant moved out or will move out
              </p>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <FileText size={16} className="text-slate-400" />
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any notes about the move-out..."
                disabled={isSubmitting}
                maxLength={1000}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                {notes.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !moveOutDate}
              className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ending lease...
                </>
              ) : (
                "End Lease"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  FileText,
  Loader2,
  Shield,
  Banknote,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { API_BASE_URL } from "@/utils/api-config";
import { usePendingCharges } from "@/hooks/usePendingCharges";
import { SecurityDepositCalculator } from "./SecurityDepositCalculator";
import { MoveOutChecklist } from "./MoveOutChecklist";
import { FinalStatement } from "./FinalStatement";

export function EndLeaseSection({
  tenantUnit,
  rentInvoices = [],
  financialRecords = [],
  securityDepositRefunds = [],
  onLeaseEnded,
}) {
  const [moveOutDate, setMoveOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [checklistNotes, setChecklistNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [refundCreated, setRefundCreated] = useState(false);

  const {
    charges: pendingCharges,
    loading: pendingChargesLoading,
    refresh: refreshPendingCharges,
  } = usePendingCharges(tenantUnit?.id, { enabled: !!tenantUnit?.id });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setMoveOutDate(today);
  }, []);

  useEffect(() => {
    if (checklistNotes) {
      setNotes((prev) => {
        const combined = [prev, checklistNotes].filter(Boolean).join("\n\n");
        return combined;
      });
    }
  }, [checklistNotes]);

  if (!tenantUnit || tenantUnit.status !== "active") {
    return null;
  }

  const outstandingBalance = pendingCharges.reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );

  const securityDeposit = Number(tenantUnit.security_deposit_paid) || 0;
  const advanceRentRemaining = Number(tenantUnit.advance_rent_remaining) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!confirmEnd) {
      setError("Please confirm that all outstanding balances are settled.");
      return;
    }

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
        `${API_BASE_URL}/tenant-units/${tenantUnit.id}/end-lease`,
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message ||
            errorData?.error ||
            `Failed to end lease (HTTP ${response.status})`
        );
      }

      // Success
      onLeaseEnded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white/70 p-6">
        <div className="mb-6 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          <h2 className="text-xl font-semibold text-slate-900">End Lease</h2>
        </div>

        {/* Pre-End Lease Warnings */}
        <section className="mb-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertCircle size={16} className="text-slate-400" />
            Outstanding Balances & Warnings
          </div>

          {pendingChargesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : outstandingBalance > 0 ? (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    Outstanding Balance Detected
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    There is an outstanding balance of{" "}
                    <strong>{formatMVR(outstandingBalance)}</strong> that should
                    be settled before ending the lease.
                  </p>
                  <div className="mt-3 space-y-2">
                    {pendingCharges.map((charge, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded bg-white/80 px-3 py-2 text-sm"
                      >
                        <span className="text-amber-900">
                          {charge.description || charge.title}
                        </span>
                        <span className="font-semibold text-amber-900">
                          {formatMVR(charge.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle size={18} />
              <span>No outstanding balances. Safe to proceed with ending the lease.</span>
            </div>
          )}
        </section>

        {/* Security Deposit Refund Calculator */}
        <section className="mb-6">
          <SecurityDepositCalculator
            tenantUnit={tenantUnit}
            onRefundCreated={() => {
              setRefundCreated(true);
              refreshPendingCharges();
            }}
          />
        </section>

        {/* Advance Rent Balance */}
        <section className="mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Banknote size={16} className="text-slate-400" />
            Advance Rent Balance
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatMVR(tenantUnit.advance_rent_amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Used</p>
                <p className="mt-1 text-lg font-semibold text-slate-600">
                  {formatMVR(tenantUnit.advance_rent_used || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Remaining</p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {formatMVR(advanceRentRemaining)}
                </p>
              </div>
            </div>
            {tenantUnit.advance_rent_months > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Covers months 1-{tenantUnit.advance_rent_months} of lease period
              </p>
            )}
          </div>
        </section>

        {/* Complete Lease Summary */}
        <section className="mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText size={16} className="text-slate-400" />
            Lease Summary
          </div>
          <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Lease Start</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tenantUnit.lease_start
                  ? new Date(tenantUnit.lease_start).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Lease End</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tenantUnit.lease_end
                  ? new Date(tenantUnit.lease_end).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Monthly Rent</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatMVR(tenantUnit.monthly_rent || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Security Deposit</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatMVR(securityDeposit)}
              </p>
            </div>
          </div>
        </section>

        {/* Move-Out Checklist */}
        <section className="mb-6">
          <MoveOutChecklist
            onChecklistChange={setChecklistNotes}
            initialNotes={notes}
          />
        </section>

        {/* Final Account Statement */}
        <section className="mb-6">
          <FinalStatement
            tenantUnit={tenantUnit}
            pendingCharges={pendingCharges}
            rentInvoices={rentInvoices}
            financialRecords={financialRecords}
            securityDepositRefunds={securityDepositRefunds}
          />
        </section>

        {/* End Lease Form */}
        <section>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

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
            </div>

            <div>
              <label
                htmlFor="end_lease_notes"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <FileText size={16} className="text-slate-400" />
                Notes (Optional)
              </label>
              <textarea
                id="end_lease_notes"
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

            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                id="confirm_end"
                checked={confirmEnd}
                onChange={(e) => setConfirmEnd(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <label
                htmlFor="confirm_end"
                className="flex-1 text-sm text-slate-700"
              >
                I confirm that all outstanding balances are settled and I am
                ready to end this lease.
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !moveOutDate || !confirmEnd}
                className="inline-flex items-center gap-2 rounded-lg bg-danger px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ending lease...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    End Lease
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}


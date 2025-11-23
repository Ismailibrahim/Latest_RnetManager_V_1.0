"use client";

import { useMemo } from "react";
import { FileText, Calculator, Wallet, Shield, Banknote } from "lucide-react";
import { formatMVR } from "@/lib/currency";

export function FinalStatement({
  tenantUnit,
  pendingCharges = [],
  rentInvoices = [],
  financialRecords = [],
  securityDepositRefunds = [],
}) {
  const statement = useMemo(() => {
    if (!tenantUnit) {
      return null;
    }

    // Calculate totals
    const totalRentDue = rentInvoices.reduce((sum, invoice) => {
      if (invoice.status === "paid" || invoice.status === "overdue") {
        return sum + (Number(invoice.rent_amount) || 0) + (Number(invoice.late_fee) || 0);
      }
      return sum;
    }, 0);

    const totalRentPaid = rentInvoices.reduce((sum, invoice) => {
      if (invoice.status === "paid") {
        return sum + (Number(invoice.rent_amount) || 0) + (Number(invoice.late_fee) || 0);
      }
      return sum;
    }, 0);

    const outstandingBalance = pendingCharges.reduce(
      (sum, charge) => sum + (Number(charge.amount) || 0),
      0
    );

    const securityDeposit = Number(tenantUnit.security_deposit_paid) || 0;
    const advanceRentCollected = Number(tenantUnit.advance_rent_amount) || 0;
    const advanceRentUsed = Number(tenantUnit.advance_rent_used) || 0;
    const advanceRentRemaining = Number(tenantUnit.advance_rent_remaining) || 0;

    // Calculate total refunds processed
    const totalRefundsProcessed = securityDepositRefunds
      .filter((refund) => refund.status === "processed")
      .reduce((sum, refund) => sum + (Number(refund.refund_amount) || 0), 0);

    // Calculate final refund amount
    const securityDepositRefund = securityDeposit - totalRefundsProcessed;
    const finalRefundAmount = securityDepositRefund + advanceRentRemaining;

    return {
      totalRentDue,
      totalRentPaid,
      outstandingBalance,
      securityDeposit,
      advanceRentCollected,
      advanceRentUsed,
      advanceRentRemaining,
      totalRefundsProcessed,
      securityDepositRefund,
      finalRefundAmount,
      invoiceCount: rentInvoices.length,
      paidInvoiceCount: rentInvoices.filter((inv) => inv.status === "paid").length,
    };
  }, [tenantUnit, pendingCharges, rentInvoices, financialRecords, securityDepositRefunds]);

  if (!statement) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FileText size={16} className="text-slate-400" />
        Final Account Statement
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="space-y-6">
          {/* Rent Summary */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Wallet size={16} className="text-primary" />
              Rent Summary
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Rent Due:</span>
                <span className="font-semibold text-slate-900">
                  {formatMVR(statement.totalRentDue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Rent Paid:</span>
                <span className="font-semibold text-emerald-600">
                  {formatMVR(statement.totalRentPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Outstanding Balance:</span>
                <span
                  className={`font-semibold ${
                    statement.outstandingBalance > 0
                      ? "text-red-600"
                      : "text-slate-900"
                  }`}
                >
                  {formatMVR(statement.outstandingBalance)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Invoices:</span>
                <span>
                  {statement.paidInvoiceCount} paid of {statement.invoiceCount} total
                </span>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200" />

          {/* Security Deposit */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Shield size={16} className="text-primary" />
              Security Deposit
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Original Deposit:</span>
                <span className="font-semibold text-slate-900">
                  {formatMVR(statement.securityDeposit)}
                </span>
              </div>
              {statement.totalRefundsProcessed > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Refunds Processed:</span>
                  <span className="font-semibold text-slate-600">
                    {formatMVR(statement.totalRefundsProcessed)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Available for Refund:</span>
                <span className="font-semibold text-primary">
                  {formatMVR(statement.securityDepositRefund)}
                </span>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-200" />

          {/* Advance Rent */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Banknote size={16} className="text-primary" />
              Advance Rent
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Advance Rent Collected:</span>
                <span className="font-semibold text-slate-900">
                  {formatMVR(statement.advanceRentCollected)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Advance Rent Used:</span>
                <span className="font-semibold text-slate-600">
                  {formatMVR(statement.advanceRentUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Advance Rent Remaining:</span>
                <span className="font-semibold text-primary">
                  {formatMVR(statement.advanceRentRemaining)}
                </span>
              </div>
            </div>
          </section>

          <div className="border-t-2 border-primary" />

          {/* Final Summary */}
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calculator size={16} className="text-primary" />
              Final Summary
            </div>
            <div className="space-y-3 rounded-lg bg-slate-50 p-4">
              <div className="flex justify-between text-base">
                <span className="font-semibold text-slate-700">
                  Total Refund Amount:
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatMVR(statement.finalRefundAmount)}
                </span>
              </div>
              {statement.outstandingBalance > 0 && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Note:</strong> There is an outstanding balance of{" "}
                  {formatMVR(statement.outstandingBalance)}. This should be
                  settled before processing the final refund.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


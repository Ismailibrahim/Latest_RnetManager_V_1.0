"use client";

import { useState, useEffect } from "react";
import { Shield, Calculator, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency-formatter";
import { API_BASE_URL } from "@/utils/api-config";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

export function SecurityDepositCalculator({ tenantUnit, onRefundCreated }) {
  const [originalDeposit, setOriginalDeposit] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [deductionReasons, setDeductionReasons] = useState([]);
  const [refundDate, setRefundDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const {
    options: paymentMethodOptions,
    loading: paymentMethodLoading,
  } = usePaymentMethods({ onlyActive: true });

  useEffect(() => {
    if (tenantUnit?.security_deposit_paid) {
      const deposit = Number(tenantUnit.security_deposit_paid) || 0;
      setOriginalDeposit(deposit);
      setRefundAmount(deposit);
    }
  }, [tenantUnit]);

  useEffect(() => {
    const totalDeductions = deductionReasons.reduce(
      (sum, reason) => sum + (Number(reason.amount) || 0),
      0
    );
    setDeductions(totalDeductions);
    setRefundAmount(Math.max(0, originalDeposit - totalDeductions));
  }, [deductionReasons, originalDeposit]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setRefundDate(today);
  }, []);

  const handleAddDeduction = () => {
    setDeductionReasons([
      ...deductionReasons,
      { category: "", amount: "", note: "" },
    ]);
  };

  const handleRemoveDeduction = (index) => {
    setDeductionReasons(deductionReasons.filter((_, i) => i !== index));
  };

  const handleDeductionChange = (index, field, value) => {
    const updated = [...deductionReasons];
    updated[index] = { ...updated[index], [field]: value };
    setDeductionReasons(updated);
  };

  const handleCreateRefund = async () => {
    if (!tenantUnit?.id) {
      setError("Invalid tenant unit");
      return;
    }

    if (refundAmount < 0) {
      setError("Refund amount cannot be negative");
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to create a refund.");
      }

      const payload = {
        tenant_unit_id: tenantUnit.id,
        refund_date: refundDate,
        original_deposit: originalDeposit,
        deductions: deductions,
        refund_amount: refundAmount,
        deduction_reasons: deductionReasons
          .filter((r) => r.category || r.amount || r.note)
          .map((r) => ({
            category: r.category || "Other",
            amount: Number(r.amount) || 0,
            note: r.note || "",
          })),
        status: "pending",
        payment_method: paymentMethod || null,
        transaction_reference: transactionReference || null,
      };

      const response = await fetch(`${API_BASE_URL}/security-deposit-refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.message ||
            errorData?.error ||
            `Failed to create refund (HTTP ${response.status})`
        );
      }

      setSuccess(true);
      onRefundCreated?.();
      
      // Reset form after a delay
      setTimeout(() => {
        setDeductionReasons([]);
        setPaymentMethod("");
        setTransactionReference("");
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Shield size={16} className="text-slate-400" />
        Security Deposit Refund Calculator
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          <Shield size={18} className="mt-0.5 flex-shrink-0" />
          <p>Security deposit refund created successfully!</p>
        </div>
      )}

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Original Deposit
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
              {(() => {
                // Use security_deposit_currency from API response, or fall back to unit's security_deposit_currency
                const securityDepositCurrency = tenantUnit?.security_deposit_currency 
                  ?? tenantUnit?.unit?.security_deposit_currency
                  ?? tenantUnit?.unit?.currency
                  ?? tenantUnit?.currency
                  ?? 'MVR';
                return formatCurrencyUtil(originalDeposit, securityDepositCurrency);
              })()}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Total Deductions
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
              {formatMVR(deductions)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Refund Amount
            </span>
            <span className="text-xl font-bold text-primary">
              {(() => {
                // Use security_deposit_currency from API response, or fall back to unit's security_deposit_currency
                const securityDepositCurrency = tenantUnit?.security_deposit_currency 
                  ?? tenantUnit?.unit?.security_deposit_currency
                  ?? tenantUnit?.unit?.currency
                  ?? tenantUnit?.currency
                  ?? 'MVR';
                return formatCurrencyUtil(refundAmount, securityDepositCurrency);
              })()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Deduction Reasons
          </label>
          <button
            type="button"
            onClick={handleAddDeduction}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/20"
          >
            <Plus size={14} />
            Add Deduction
          </button>
        </div>

        {deductionReasons.length === 0 ? (
          <p className="text-sm text-slate-500">
            No deductions added. Click &quot;Add Deduction&quot; to add any deductions.
          </p>
        ) : (
          <div className="space-y-2">
            {deductionReasons.map((reason, index) => (
              <div
                key={index}
                className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex-1 grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Category (e.g., Cleaning, Damage)"
                    value={reason.category}
                    onChange={(e) =>
                      handleDeductionChange(index, "category", e.target.value)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={reason.amount}
                    onChange={(e) =>
                      handleDeductionChange(index, "amount", e.target.value)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    placeholder="Note"
                    value={reason.note}
                    onChange={(e) =>
                      handleDeductionChange(index, "note", e.target.value)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDeduction(index)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Refund Date
          </label>
          <input
            type="date"
            value={refundDate}
            onChange={(e) => setRefundDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Payment Method (Optional)
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={paymentMethodLoading}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select payment method</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Transaction Reference (Optional)
          </label>
          <input
            type="text"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="Enter transaction reference number"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreateRefund}
        disabled={isCreating || refundAmount < 0}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Refund...
          </>
        ) : (
          <>
            <Calculator size={16} />
            Create Security Deposit Refund
          </>
        )}
      </button>
    </div>
  );
}


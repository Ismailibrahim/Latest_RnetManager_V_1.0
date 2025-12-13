"use client";

import { useState } from "react";
import { Calendar, DollarSign, FileText, Upload, X, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";
import ReceiptUpload from "./ReceiptUpload";

export default function PaymentForm({ invoice, currency, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    amount: invoice.total_amount.toFixed(2),
    date: new Date().toISOString().split("T")[0],
    method: "cash",
    receipt: null,
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "bank_deposit", label: "Bank Deposit" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  const requiresReceipt = formData.method === "bank_deposit" || formData.method === "bank_transfer";

  const validate = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Payment amount must be greater than 0";
    }

    if (!formData.date) {
      newErrors.date = "Payment date is required";
    }

    if (!formData.method) {
      newErrors.method = "Payment method is required";
    }

    if (requiresReceipt && !formData.receipt) {
      newErrors.receipt = "Receipt is required for bank deposit and bank transfer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        amount: parseFloat(formData.amount),
        date: formData.date,
        method: formData.method,
        receipt: formData.receipt,
        notes: formData.notes || null,
      });
    } catch (err) {
      // Error handling is done in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Invoice Details
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm text-slate-600">Total Amount:</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(invoice.total_amount, currency)}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          <DollarSign size={16} className="mr-1 inline" />
          Payment Amount *
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount}
          onChange={(e) =>
            setFormData({ ...formData, amount: e.target.value })
          }
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            errors.amount
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
          placeholder="Enter payment amount"
        />
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          You can pay partial or full amount
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          <Calendar size={16} className="mr-1 inline" />
          Payment Date *
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          max={new Date().toISOString().split("T")[0]}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            errors.date
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
        />
        {errors.date && (
          <p className="mt-1 text-xs text-red-600">{errors.date}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Payment Method *
        </label>
        <select
          value={formData.method}
          onChange={(e) => setFormData({ ...formData, method: e.target.value, receipt: null })}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${
            errors.method
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
        >
          {paymentMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        {errors.method && (
          <p className="mt-1 text-xs text-red-600">{errors.method}</p>
        )}
        {requiresReceipt && (
          <p className="mt-1 text-xs text-amber-600">
            Receipt upload is required for this payment method
          </p>
        )}
      </div>

      {requiresReceipt && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            <Upload size={16} className="mr-1 inline" />
            Receipt * (PDF, JPG, PNG - Max 10MB)
          </label>
          <ReceiptUpload
            value={formData.receipt}
            onChange={(file) => setFormData({ ...formData, receipt: file })}
            error={errors.receipt}
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          <FileText size={16} className="mr-1 inline" />
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          placeholder="Add any additional notes about this payment..."
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileText size={16} />
              Submit Payment
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </form>
  );
}


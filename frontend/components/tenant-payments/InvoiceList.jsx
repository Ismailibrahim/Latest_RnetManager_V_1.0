"use client";

import { Calendar, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

export default function InvoiceList({ invoices, selectedInvoice, onSelect, currency }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">No invoices available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <button
          key={invoice.id}
          type="button"
          onClick={() => onSelect(invoice)}
          className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
            selectedInvoice?.id === invoice.id
              ? "border-primary bg-primary/5 shadow-md"
              : "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-600" />
                <span className="font-semibold text-slate-900">
                  {invoice.invoice_number}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    invoice.status === "overdue"
                      ? "bg-red-100 text-red-700"
                      : invoice.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
              
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                {invoice.invoice_date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Invoice: {formatDate(invoice.invoice_date)}</span>
                  </div>
                )}
                {invoice.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Due: {formatDate(invoice.due_date)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500">Rent:</span>
                  <span className="font-medium text-slate-700">
                    {formatCurrency(invoice.rent_amount, currency)}
                  </span>
                </div>
                {invoice.late_fee > 0 && (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs text-slate-500">Late Fee:</span>
                    <span className="font-medium text-red-600">
                      +{formatCurrency(invoice.late_fee, currency)}
                    </span>
                  </div>
                )}
                {invoice.advance_rent_applied > 0 && (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs text-slate-500">Advance Applied:</span>
                    <span className="font-medium text-emerald-600">
                      -{formatCurrency(invoice.advance_rent_applied, currency)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-baseline gap-2 border-t border-slate-200 pt-2">
                  <span className="text-sm font-semibold text-slate-900">Total:</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(invoice.total_amount, currency)}
                  </span>
                </div>
              </div>
            </div>

            {selectedInvoice?.id === invoice.id && (
              <CheckCircle2 size={20} className="text-primary flex-shrink-0" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


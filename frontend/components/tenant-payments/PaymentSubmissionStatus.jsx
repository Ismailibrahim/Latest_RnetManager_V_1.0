"use client";

import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";
import { API_BASE_URL } from "@/utils/api-config";

export default function PaymentSubmissionStatus({
  invoiceId,
  currency = "MVR",
  onSubmissionChange,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use ref to store the callback to avoid infinite loops
  const onSubmissionChangeRef = useRef(onSubmissionChange);
  
  // Update ref when callback changes
  useEffect(() => {
    onSubmissionChangeRef.current = onSubmissionChange;
  }, [onSubmissionChange]);

  useEffect(() => {
    if (!invoiceId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchSubmissions() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view payment submissions.");
        }

        const response = await fetch(
          `${API_BASE_URL}/tenant/invoices/${invoiceId}/submissions`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.message ?? `Unable to load submissions (HTTP ${response.status}).`
          );
        }

        const payload = await response.json();
        if (!isMounted) return;

        const submissionsData = Array.isArray(payload?.data) ? payload.data : [];
        setSubmissions(submissionsData);
        
        // Notify parent if there's a pending submission (using ref to avoid dependency)
        if (onSubmissionChangeRef.current) {
          const hasPending = submissionsData.some((s) => s.status === "pending");
          onSubmissionChangeRef.current(hasPending, submissionsData);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSubmissions();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [invoiceId]); // Removed onSubmissionChange from dependencies

  if (!invoiceId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        <span>Loading payment status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return null;
  }

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const confirmedSubmissions = submissions.filter((s) => s.status === "confirmed");
  const rejectedSubmissions = submissions.filter((s) => s.status === "rejected");

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={18} className="text-amber-600" />;
      case "confirmed":
        return <CheckCircle2 size={18} className="text-green-600" />;
      case "rejected":
        return <XCircle size={18} className="text-red-600" />;
      default:
        return <AlertCircle size={18} className="text-slate-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "border-amber-200 bg-amber-50 text-amber-900";
      case "confirmed":
        return "border-green-200 bg-green-50 text-green-900";
      case "rejected":
        return "border-red-200 bg-red-50 text-red-900";
      default:
        return "border-slate-200 bg-slate-50 text-slate-900";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending Confirmation";
      case "confirmed":
        return "Confirmed";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "cash":
        return "Cash";
      case "bank_deposit":
        return "Bank Deposit";
      case "bank_transfer":
        return "Bank Transfer";
      default:
        return method;
    }
  };

  return (
    <div className="space-y-3">
      {pendingSubmissions.length > 0 && (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            {getStatusIcon("pending")}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-900">
                  Payment Submission Pending
                </h3>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                  {pendingSubmissions.length} {pendingSubmissions.length === 1 ? "submission" : "submissions"}
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                You have a payment submission waiting for owner confirmation. Please do not submit another payment until this one is processed.
              </p>
              
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="mt-3 rounded-lg border border-amber-200 bg-white p-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(submission.payment_amount, currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {getPaymentMethodLabel(submission.payment_method)}
                        </span>
                      </div>
                    </div>
                    {submission.payment_date && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={12} />
                        <span>
                          Payment Date: {formatDate(submission.payment_date)}
                        </span>
                      </div>
                    )}
                    {submission.created_at && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>
                          Submitted: {formatDateTime(submission.created_at)}
                        </span>
                      </div>
                    )}
                    {submission.notes && (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-medium">Notes:</span> {submission.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmedSubmissions.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            {getStatusIcon("confirmed")}
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Confirmed Payments</h3>
              <p className="mt-1 text-xs text-green-700">
                The following payments have been confirmed by the owner:
              </p>
              <div className="mt-2 space-y-2">
                {confirmedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border border-green-200 bg-white p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(submission.payment_amount, currency)}
                      </span>
                      <span className="text-xs text-slate-600">
                        {getPaymentMethodLabel(submission.payment_method)}
                      </span>
                    </div>
                    {submission.confirmed_at && (
                      <div className="mt-1 text-xs text-slate-500">
                        Confirmed: {formatDateTime(submission.confirmed_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectedSubmissions.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            {getStatusIcon("rejected")}
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Rejected Payments</h3>
              <p className="mt-1 text-xs text-red-700">
                The following payments were rejected. You may submit a new payment:
              </p>
              <div className="mt-2 space-y-2">
                {rejectedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border border-red-200 bg-white p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(submission.payment_amount, currency)}
                      </span>
                      <span className="text-xs text-slate-600">
                        {getPaymentMethodLabel(submission.payment_method)}
                      </span>
                    </div>
                    {submission.notes && (
                      <div className="mt-1 text-xs text-red-600">
                        Reason: {submission.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


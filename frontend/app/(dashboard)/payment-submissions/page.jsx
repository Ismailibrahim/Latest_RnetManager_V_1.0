"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  Building2,
  FileText,
  Filter,
  RefreshCcw,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrency } from "@/lib/currency-formatter";
import { formatDate, formatDateTime } from "@/utils/formatters";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
];

export default function PaymentSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [pagination, setPagination] = useState({ nextUrl: null });

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to view payment submissions.");
      }

      const url = new URL(`${API_BASE_URL}/tenant-payment-submissions`);
      url.searchParams.set("per_page", "20");
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Unable to load submissions (HTTP ${response.status}).`
        );
      }

      const payload = await response.json();
      setSubmissions(Array.isArray(payload?.data) ? payload.data : []);
      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions, refreshKey]);

  const handleConfirm = async (submission) => {
    if (!confirm(`Confirm this payment submission of ${formatCurrency(submission.payment_amount, submission.tenant_unit?.currency || "MVR")}?`)) {
      return;
    }

    setConfirming(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to confirm payment.");
      }

      const response = await fetch(
        `${API_BASE_URL}/tenant-payment-submissions/${submission.id}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to confirm payment (HTTP ${response.status}).`
        );
      }

      alert("Payment confirmed successfully!");
      setRefreshKey((k) => k + 1);
      setShowDetailsModal(false);
      setSelectedSubmission(null);
    } catch (err) {
      alert(`Failed to confirm payment: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async (submission) => {
    if (!rejectNotes.trim()) {
      alert("Please provide a reason for rejecting this payment.");
      return;
    }

    if (!confirm(`Reject this payment submission? The tenant will be notified.`)) {
      return;
    }

    setRejecting(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to reject payment.");
      }

      const response = await fetch(
        `${API_BASE_URL}/tenant-payment-submissions/${submission.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: rejectNotes.trim(),
          }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to reject payment (HTTP ${response.status}).`
        );
      }

      alert("Payment rejected. The tenant has been notified.");
      setRefreshKey((k) => k + 1);
      setShowDetailsModal(false);
      setSelectedSubmission(null);
      setRejectNotes("");
    } catch (err) {
      alert(`Failed to reject payment: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  const handleDownloadReceipt = async (submission) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Please log in to download receipt.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/tenant-payment-submissions/${submission.id}/receipt`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/pdf,image/*,*/*",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Failed to download receipt (HTTP ${response.status}).`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      // Check if blob is empty or invalid
      if (blob.size === 0) {
        throw new Error("Received empty file from server.");
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `receipt-${submission.id}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Add extension if not present
      if (!filename.includes('.')) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('pdf')) {
          filename += '.pdf';
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          filename += '.jpg';
        } else if (contentType.includes('png')) {
          filename += '.png';
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err) {
      console.error('Download error:', err);
      alert(`Failed to download receipt: ${err.message}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={18} className="text-amber-600" />;
      case "confirmed":
        return <CheckCircle2 size={18} className="text-green-600" />;
      case "rejected":
        return <XCircle size={18} className="text-red-600" />;
      default:
        return <AlertTriangle size={18} className="text-slate-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
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

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Payment Management
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Clock size={22} className="text-primary" />
              Payment Submissions
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review and manage payment submissions from tenants. Confirm or reject payments after verification.
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Confirmed</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {submissions.filter((s) => s.status === "confirmed").length}
                </p>
              </div>
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{submissions.length}</p>
              </div>
              <FileText size={24} className="text-slate-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={18} className="text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submissions List */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <span>Loading payment submissions...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
            <Clock size={48} className="mx-auto text-slate-400" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              No payment submissions found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {statusFilter !== "all"
                ? `No ${statusFilter} submissions at this time.`
                : "Tenants haven't submitted any payments yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(submission.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(
                              submission.payment_amount,
                              submission.tenant_unit?.currency || "MVR"
                            )}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                              submission.status
                            )}`}
                          >
                            {submission.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                          {submission.tenant_unit?.tenant?.full_name && (
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{submission.tenant_unit.tenant.full_name}</span>
                            </div>
                          )}
                          {submission.tenant_unit?.unit?.unit_number && (
                            <div className="flex items-center gap-1">
                              <Building2 size={12} />
                              <span>Unit {submission.tenant_unit.unit.unit_number}</span>
                            </div>
                          )}
                          {submission.payment_date && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{formatDate(submission.payment_date)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <CreditCard size={12} />
                            <span>{getPaymentMethodLabel(submission.payment_method)}</span>
                          </div>
                        </div>
                        {submission.rent_invoice?.invoice_number && (
                          <div className="mt-2 text-xs text-slate-500">
                            Invoice: {submission.rent_invoice.invoice_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.receipt_path && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("auth_token");
                              if (!token) {
                                alert("Please log in to view receipt.");
                                return;
                              }
                              // Create a blob URL with authentication
                              const response = await fetch(
                                `${API_BASE_URL}/tenant-payment-submissions/${submission.id}/receipt/view`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                }
                              );
                              if (!response.ok) {
                                throw new Error("Failed to load receipt.");
                              }
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } catch (err) {
                              alert(`Failed to view receipt: ${err.message}`);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          <Eye size={14} />
                          View Receipt
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(submission)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setShowDetailsModal(true);
                        setRejectNotes("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {showDetailsModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowDetailsModal(false);
              setSelectedSubmission(null);
            }}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Payment Submission Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSubmission(null);
                }}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">Amount</label>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(
                      selectedSubmission.payment_amount,
                      selectedSubmission.tenant_unit?.currency || "MVR"
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusIcon(selectedSubmission.status)}
                    <span className="font-medium capitalize">{selectedSubmission.status}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Payment Date</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedSubmission.payment_date
                      ? formatDate(selectedSubmission.payment_date)
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Payment Method</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {getPaymentMethodLabel(selectedSubmission.payment_method)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Tenant</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedSubmission.tenant_unit?.tenant?.full_name || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Unit</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedSubmission.tenant_unit?.unit?.unit_number || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Invoice</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedSubmission.rent_invoice?.invoice_number || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Submitted</label>
                  <p className="mt-1 text-sm text-slate-900">
                    {selectedSubmission.created_at
                      ? formatDateTime(selectedSubmission.created_at)
                      : "—"}
                  </p>
                </div>
              </div>

              {selectedSubmission.notes && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Notes</label>
                  <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                    {selectedSubmission.notes}
                  </p>
                </div>
              )}

              {selectedSubmission.receipt_path && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Receipt</label>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("auth_token");
                          if (!token) {
                            alert("Please log in to view receipt.");
                            return;
                          }
                          const response = await fetch(
                            `${API_BASE_URL}/tenant-payment-submissions/${selectedSubmission.id}/receipt/view`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );
                          if (!response.ok) {
                            throw new Error("Failed to load receipt.");
                          }
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch (err) {
                          alert(`Failed to view receipt: ${err.message}`);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
                    >
                      <Eye size={16} />
                      View Receipt
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(selectedSubmission)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Download size={16} />
                      Download Receipt
                    </button>
                  </div>
                </div>
              )}

              {selectedSubmission.status === "pending" && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedSubmission(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => handleReject(selectedSubmission)}
                      disabled={rejecting || !rejectNotes.trim()}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {rejecting ? (
                        <>
                          <Loader2 size={14} className="mr-2 inline animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Reject"
                      )}
                    </button>
                    <button
                      onClick={() => handleConfirm(selectedSubmission)}
                      disabled={confirming}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {confirming ? (
                        <>
                          <Loader2 size={14} className="mr-2 inline animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        "Confirm Payment"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


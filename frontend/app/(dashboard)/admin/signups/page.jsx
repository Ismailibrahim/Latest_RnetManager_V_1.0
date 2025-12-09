"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSignupsPage() {
  const { user } = useAuth();
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedSignup, setSelectedSignup] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [flashMessage, setFlashMessage] = useState(null);

  // Check if user is super admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      setError("Access denied. Super admin access required.");
      setLoading(false);
    }
  }, [user]);

  const fetchSignups = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "15",
      });

      if (search) params.append("search", search);
      if (tierFilter !== "all") params.append("subscription_tier", tierFilter);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/admin/signups?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch (fetchError) {
        // Network error - backend might not be running or CORS issue
        console.error("Network error:", fetchError);
        throw new Error(
          `Unable to connect to the backend server at ${API_BASE_URL}. ` +
          `Please ensure the backend is running. Error: ${fetchError.message}`
        );
      }

      if (!response.ok) {
        let errorData = {};
        try {
          const text = await response.text();
          console.error('Raw error response:', text);
          errorData = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { message: `HTTP ${response.status} Error` };
        }
        
        console.error('Signups API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        });
        
        if (response.status === 403) {
          throw new Error("Access denied. Super admin access required.");
        }
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }
        
        // Build detailed error message
        let errorMessage = errorData.message || errorData.error || `Failed to fetch signups (HTTP ${response.status})`;
        
        // Add technical details if available (for debugging)
        if (errorData.error) {
          errorMessage += `\n\nError: ${errorData.error}`;
        }
        if (errorData.file) {
          errorMessage += `\nFile: ${errorData.file}`;
          if (errorData.line) {
            errorMessage += `:${errorData.line}`;
          }
        }
        if (errorData.class) {
          errorMessage += `\nException: ${errorData.class}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSignups(data.data || []);
      setPagination(data.meta || {});
    } catch (err) {
      console.error("Error fetching signups:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchSignups();
    }
  }, [currentPage, search, tierFilter, user]);

  const handleApprove = async (signup) => {
    if (!confirm(`Approve signup for ${signup.email}?`)) return;

    setProcessingId(signup.id);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE_URL}/admin/signups/${signup.id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to approve signup");
      }

      setFlashMessage({
        type: "success",
        message: "Signup approved successfully!",
      });
      fetchSignups();
    } catch (err) {
      setFlashMessage({
        type: "error",
        message: err.message,
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFlashMessage(null), 5000);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(selectedSignup.id);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_BASE_URL}/admin/signups/${selectedSignup.id}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reject signup");
      }

      setFlashMessage({
        type: "success",
        message: "Signup rejected successfully!",
      });
      setRejectModalOpen(false);
      setSelectedSignup(null);
      setRejectionReason("");
      fetchSignups();
    } catch (err) {
      setFlashMessage({
        type: "error",
        message: err.message,
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFlashMessage(null), 5000);
    }
  };

  const openRejectModal = (signup) => {
    setSelectedSignup(signup);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Access denied. Super admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending Signups</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review and approve or reject new user registrations
          </p>
        </div>
        <button
          onClick={fetchSignups}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {flashMessage && (
        <div
          className={`rounded-lg border p-4 ${
            flashMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Tiers</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-1">Error Loading Signups</p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap bg-red-100 p-2 rounded mt-2 overflow-auto">
                {error}
              </pre>
              {error.includes("Unable to connect") && (
                <div className="mt-2 text-xs text-red-700">
                  <p className="mb-1">Troubleshooting steps:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Ensure the backend server is running: <code className="bg-red-100 px-1 rounded">php artisan serve</code></li>
                    <li>Check that the API URL is correct: <code className="bg-red-100 px-1 rounded">{API_BASE_URL}</code></li>
                    <li>Verify CORS is configured to allow requests from this origin</li>
                    <li>Check browser console and network tab for more details</li>
                  </ul>
                </div>
              )}
              {error.includes("Technical Details") && (
                <div className="mt-2 text-xs text-red-700">
                  <p className="mb-1">Backend Error Details:</p>
                  <p className="font-mono text-xs bg-red-100 p-2 rounded">
                    Check backend logs: <code>backend/storage/logs/laravel.log</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : signups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <UserPlus size={48} className="mx-auto text-slate-400" />
          <p className="mt-4 text-sm font-medium text-slate-900">
            No pending signups
          </p>
          <p className="mt-1 text-sm text-slate-600">
            All signups have been processed.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Signup Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {signups.map((signup) => (
                  <tr key={signup.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {signup.first_name} {signup.last_name}
                        </div>
                        <div className="text-sm text-slate-500">{signup.email}</div>
                        <div className="text-xs text-slate-500">{signup.mobile}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                      {signup.landlord?.company_name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                        {signup.landlord?.subscription_tier || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {new Date(signup.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(signup)}
                          disabled={processingId === signup.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId === signup.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(signup)}
                          disabled={processingId === signup.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {signups.length} of {pagination.total} signups
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page === 1}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pagination.last_page, p + 1))
                  }
                  disabled={pagination.current_page === pagination.last_page}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedSignup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Reject Signup
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Rejecting signup for{" "}
              <strong>
                {selectedSignup.first_name} {selectedSignup.last_name}
              </strong>{" "}
              ({selectedSignup.email})
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedSignup(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {processingId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Rejecting...
                  </span>
                ) : (
                  "Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  LogIn,
  Search,
  RefreshCcw,
  Loader2,
  AlertCircle,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
// Date formatting helper

export default function UserLoginLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [currentPage, search, userId, dateFrom, dateTo]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      if (!API_BASE_URL) {
        throw new Error("API configuration error. Please check your environment settings.");
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "50",
      });

      if (search) params.append("search", search);
      if (userId) params.append("user_id", userId);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await fetch(
        `${API_BASE_URL}/admin/user-login-logs?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = "Failed to fetch login logs";
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to view login logs.";
        } else if (response.status === 404) {
          errorMessage = "Login logs endpoint not found.";
        } else if (response.status >= 500) {
          // For server errors, try to show more details if available
          if (errorDetails?.message) {
            errorMessage = `Server error: ${errorDetails.message}`;
          } else {
            errorMessage = "Server error. Please try again later.";
          }
        }
        
        // Log full error details for debugging
        console.error("API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          error: errorDetails,
          url: `${API_BASE_URL}/admin/user-login-logs?${params.toString()}`,
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setLogs(data.data || []);
      setPagination({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        per_page: data.per_page || 50,
        total: data.total || 0,
      });
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err.message || "Failed to load login logs");
      }
      console.error("Error fetching login logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      if (!API_BASE_URL) {
        console.error("API configuration error. Statistics will not be loaded.");
        return;
      }

      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await fetch(
        `${API_BASE_URL}/admin/user-login-logs/statistics?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        // Log error but don't show to user since statistics are non-critical
        console.warn("Failed to fetch statistics:", response.status, response.statusText);
      }
    } catch (err) {
      // Log error but don't show to user since statistics are non-critical
      console.error("Error fetching statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchStatistics();
  };

  const handleResetFilters = () => {
    setSearch("");
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Login Logs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track and monitor user login activity
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && !statsLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total Logins
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {statistics.total_logins || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Unique Users
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {statistics.unique_users || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Today&apos;s Logins
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {statistics.today_logins || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Active Today
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {statistics.unique_today_users || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name or email..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              User ID
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by user ID..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        {(search || userId || dateFrom || dateTo) && (
          <button
            onClick={handleResetFilters}
            className="text-sm text-primary hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Logs Table */}
      {!loading && !error && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Login Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No login logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {log.user?.full_name || "Unknown User"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {log.user?.email || "N/A"}
                          </div>
                          {log.user?.role && (
                            <div className="mt-1">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                                {log.user.role.replace("_", " ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                        {formatDateTime(log.logged_in_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {log.ip_address || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {log.device_info ? (
                          <div>
                            <div className="font-medium">
                              {log.device_info.device} - {log.device_info.os}
                            </div>
                            <div className="text-xs text-slate-400">
                              {log.device_info.browser}
                            </div>
                          </div>
                        ) : (
                          "Unknown"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{" "}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{" "}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={pagination.current_page === 1}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
                    disabled={pagination.current_page === pagination.last_page}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


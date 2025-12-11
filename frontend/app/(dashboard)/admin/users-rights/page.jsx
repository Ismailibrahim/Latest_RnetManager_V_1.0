"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCcw,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { RoleBadge } from "@/components/users/RoleBadge";
import { UserRoleSelector } from "@/components/users/UserRoleSelector";
import { PermissionMatrix } from "@/components/users/PermissionMatrix";

export default function UsersRightsPage() {
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'matrix'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Permission matrix state
  const [matrix, setMatrix] = useState(null);
  const [resources, setResources] = useState(null);
  const [roles, setRoles] = useState([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [updatingRoles, setUpdatingRoles] = useState(new Set());

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "matrix") {
      fetchPermissionMatrix();
    }
  }, [activeTab, currentPage, search, roleFilter, statusFilter]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/account`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        setCurrentUser(payload?.user);
      }
    } catch {
      // Ignore errors
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "50",
      });

      if (search) params.append("search", search);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.data || []);
      setPagination(data.meta || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionMatrix = async () => {
    setMatrixLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/permissions/matrix`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch permission matrix");
      }

      const data = await response.json();
      setMatrix(data.matrix || {});
      setResources(data.resources || {});
      setRoles(data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatrixLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoles((prev) => new Set(prev).add(userId));

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update role");
      }

      // Refresh users list
      await fetchUsers();
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Shield size={24} className="text-primary" />
            User Rights & Permissions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage user roles and view permission matrix
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "users") {
              fetchUsers();
            } else {
              fetchPermissionMatrix();
            }
          }}
          disabled={loading || matrixLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw size={16} className={loading || matrixLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Users ({pagination.total || 0})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "matrix"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Permission Matrix
            </div>
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
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
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="agent">Agent</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <Users size={48} className="mx-auto text-slate-400" />
              <p className="mt-4 text-sm font-medium text-slate-900">No users found</p>
              <p className="mt-1 text-sm text-slate-600">Try adjusting your filters</p>
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
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                          {user.landlord?.company_name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <UserRoleSelector
                            userId={user.id}
                            currentRole={user.role}
                            onRoleChange={handleRoleChange}
                            disabled={updatingRoles.has(user.id)}
                            userRole={currentUser?.role}
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 size={12} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                              <XCircle size={12} />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {users.length} of {pagination.total} users
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
        </div>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === "matrix" && (
        <div>
          <PermissionMatrix
            matrix={matrix}
            resources={resources}
            roles={roles}
            loading={matrixLoading}
          />
        </div>
      )}
    </div>
  );
}

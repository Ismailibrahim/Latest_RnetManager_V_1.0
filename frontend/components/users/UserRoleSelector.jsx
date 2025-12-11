"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

export function UserRoleSelector({
  userId,
  currentRole,
  onRoleChange,
  disabled = false,
  userRole = null, // Current logged-in user's role
}) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const roles = [
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "agent", label: "Agent" },
    { value: "super_admin", label: "Super Admin" },
  ];

  // Filter roles based on current user's permissions
  const availableRoles = roles.filter((role) => {
    // Super admins can assign any role
    if (userRole === "super_admin") return true;
    // Admins can only assign manager and agent
    if (userRole === "admin") {
      return ["manager", "agent"].includes(role.value);
    }
    return false;
  });

  const handleChange = async (e) => {
    const newRole = e.target.value;
    setSelectedRole(newRole);
    setError(null);

    if (newRole === currentRole) return;

    setUpdating(true);
    try {
      await onRoleChange(userId, newRole);
    } catch (err) {
      setError(err.message || "Failed to update role");
      setSelectedRole(currentRole); // Revert on error
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={selectedRole}
        onChange={handleChange}
        disabled={disabled || updating}
        className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-300" : ""
        }`}
      >
        {availableRoles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      {updating && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

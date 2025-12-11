"use client";

export function RoleBadge({ role, size = "sm" }) {
  const roleConfig = {
    owner: {
      label: "Owner",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    },
    admin: {
      label: "Admin",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    manager: {
      label: "Manager",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    agent: {
      label: "Agent",
      className: "bg-orange-100 text-orange-700 border-orange-200",
    },
    super_admin: {
      label: "Super Admin",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const config = roleConfig[role] || {
    label: role,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${config.className} ${sizeClasses[size]}`}
    >
      {config.label}
    </span>
  );
}

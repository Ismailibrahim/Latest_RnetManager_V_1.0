"use client";

import { AlertTriangle, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

export function SubscriptionStatusBadge({ status, daysUntilExpiry }) {
  const config = {
    active: {
      label: "Active",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
    expired: {
      label: "Expired",
      className: "bg-red-100 text-red-700 border-red-200",
      icon: XCircle,
    },
    suspended: {
      label: "Suspended",
      className: "bg-amber-100 text-amber-700 border-amber-200",
      icon: PauseCircle,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-700 border-slate-200",
      icon: XCircle,
    },
  };

  const statusConfig = config[status] || config.active;
  const Icon = statusConfig.icon;

  const getExpiryText = () => {
    if (daysUntilExpiry === null) {
      return "Never expires";
    }

    if (daysUntilExpiry < 0) {
      return `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? "s" : ""} ago`;
    }

    if (daysUntilExpiry === 0) {
      return "Expires today";
    }

    if (daysUntilExpiry <= 7) {
      return `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`;
    }

    return `Expires in ${daysUntilExpiry} days`;
  };

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.className}`}
      >
        <Icon size={14} />
        {statusConfig.label}
      </span>
      {daysUntilExpiry !== null && (
        <span
          className={`text-xs font-medium ${
            isExpired
              ? "text-red-600"
              : isExpiringSoon
                ? "text-amber-600"
                : "text-slate-600"
          }`}
        >
          {getExpiryText()}
        </span>
      )}
      {isExpiringSoon && !isExpired && (
        <AlertTriangle size={14} className="text-amber-500" />
      )}
    </div>
  );
}


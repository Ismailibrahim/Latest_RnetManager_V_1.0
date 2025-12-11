"use client";

import React from "react";
import { CheckCircle2, XCircle, Minus } from "lucide-react";
import { RoleBadge } from "./RoleBadge";

export function PermissionMatrix({ matrix, resources, roles, loading = false }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">Loading permission matrix...</div>
      </div>
    );
  }

  if (!matrix || !resources || !roles) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No permission data available.
      </div>
    );
  }

  const getActionIcon = (granted) => {
    if (granted === true) {
      return <CheckCircle2 size={16} className="text-green-600" />;
    }
    if (granted === false) {
      return <XCircle size={16} className="text-red-600" />;
    }
    return <Minus size={16} className="text-slate-400" />;
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Resource
                </th>
                {roles.map((role) => (
                  <th
                    key={role}
                    className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <RoleBadge role={role} size="sm" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {Object.entries(resources).map(([resource, actions]) => (
                <React.Fragment key={resource}>
                  {/* Resource header row */}
                  <tr className="bg-slate-50">
                    <td
                      className="sticky left-0 z-10 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-900 capitalize"
                      colSpan={roles.length + 1}
                    >
                      {resource.replace(/_/g, " ")}
                    </td>
                  </tr>
                  {/* Action rows */}
                  {actions.map((action) => (
                    <tr key={`${resource}-${action}`} className="hover:bg-slate-50">
                      <td className="sticky left-0 z-10 bg-white px-6 py-3 text-sm text-slate-600 pl-10">
                        <span className="capitalize">{action}</span>
                      </td>
                      {roles.map((role) => {
                        const granted = matrix[role]?.[resource]?.[action] ?? null;
                        return (
                          <td
                            key={`${resource}-${action}-${role}`}
                            className="whitespace-nowrap px-6 py-3 text-center"
                          >
                            <div className="flex items-center justify-center">
                              {getActionIcon(granted)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600" />
          <span>Allowed</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-red-600" />
          <span>Denied</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus size={14} className="text-slate-400" />
          <span>Not Applicable</span>
        </div>
      </div>
    </div>
  );
}

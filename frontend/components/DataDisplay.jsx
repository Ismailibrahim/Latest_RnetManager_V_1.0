"use client";

import { useEffect, useState } from "react";

/**
 * Responsive DataDisplay Component
 * 
 * Shows cards on mobile (<768px) and tables on desktop (≥768px)
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects to display
 * @param {Array} props.columns - Column definitions [{ key, label, render? }]
 * @param {Function} props.renderCard - Function to render custom card (optional)
 * @param {Function} props.onRowClick - Callback when row/card is clicked (optional)
 * @param {string} props.emptyMessage - Message when no data
 * @param {boolean} props.loading - Loading state
 * @param {string} props.loadingMessage - Loading message
 */
export function DataDisplay({
  data = [],
  columns = [],
  renderCard,
  onRowClick,
  emptyMessage = "No data available",
  loading = false,
  loadingMessage = "Loading...",
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm font-medium text-slate-600">{loadingMessage}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
        <p className="text-sm font-semibold text-slate-800">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {data.map((item, index) => {
          if (renderCard) {
            return (
              <div key={item.id ?? index} onClick={() => onRowClick?.(item)}>
                {renderCard(item, index)}
              </div>
            );
          }

          return (
            <div
              key={item.id ?? index}
              onClick={() => onRowClick?.(item)}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md cursor-pointer"
            >
              {columns.map((column) => {
                const value = item[column.key];
                const displayValue = column.render
                  ? column.render(value, item)
                  : value ?? "—";

                return (
                  <div key={column.key} className="mb-3 last:mb-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {column.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {displayValue}
                    </dd>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const rowKey = item.id ?? index;
            return (
              <tr
                key={rowKey}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((column) => {
                  const value = item[column.key];
                  const displayValue = column.render
                    ? column.render(value, item)
                    : value ?? "—";

                  return (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-slate-700"
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


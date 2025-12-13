"use client";

import { Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

export default function UnitSelector({ units, selectedUnitId, onSelect }) {
  if (units.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">
          No active units found. Please contact your landlord.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {units.map((unit) => (
        <button
          key={unit.id}
          type="button"
          onClick={() => onSelect(unit.id)}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            selectedUnitId === unit.id
              ? "border-primary bg-primary/5 shadow-md"
              : "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`rounded-lg p-2 ${
                selectedUnitId === unit.id
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Building2 size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {unit.unit_number || `Unit #${unit.id}`}
              </p>
              {unit.property_name && (
                <p className="mt-1 text-xs text-slate-500">{unit.property_name}</p>
              )}
              <p className="mt-2 text-sm font-medium text-slate-700">
                {formatCurrency(unit.monthly_rent, unit.currency)}/month
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Home,
  X,
  ExternalLink,
  User,
  Calendar,
  Wallet,
  Package,
  Search,
  Filter,
  GripVertical,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function SnapshotPage() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState(null);
  const [unitPendingCharges, setUnitPendingCharges] = useState({}); // { unitId: { tenantUnitId: charges[] } }
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [tenantUnitData, setTenantUnitData] = useState(null);
  const [loadingTenantUnit, setLoadingTenantUnit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, occupied, vacant, pending

  // Fetch properties on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchProperties() {
      setPropertiesLoading(true);
      setPropertiesError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in to view properties.");
        }

        const url = new URL(`${API_BASE_URL}/properties`);
        url.searchParams.set("per_page", "100");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load properties (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setProperties(data);
      } catch (err) {
        if (err.name === "AbortError") return;

        if (isMounted) {
          setPropertiesError(err.message);
        }
      } finally {
        if (isMounted) {
          setPropertiesLoading(false);
        }
      }
    }

    fetchProperties();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Fetch units when property is selected
  useEffect(() => {
    if (!selectedPropertyId) {
      setUnits([]);
      setUnitPendingCharges({});
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnits() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in to view units.");
        }

        const url = new URL(`${API_BASE_URL}/units`);
        url.searchParams.set("per_page", "100");
        url.searchParams.set("property_id", selectedPropertyId);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load units (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setUnits(data);

        // Fetch tenant-units and pending charges for each unit
        await fetchPendingChargesForUnits(data, token, controller, isMounted);
      } catch (err) {
        if (err.name === "AbortError") return;

        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedPropertyId]);

  // Fetch pending charges for all units
  async function fetchPendingChargesForUnits(
    unitsData,
    token,
    controller,
    isMounted,
  ) {
    const chargesMap = {};

    // First, get all tenant-units for these units
    try {
      const tenantUnitsUrl = new URL(`${API_BASE_URL}/tenant-units`);
      tenantUnitsUrl.searchParams.set("per_page", "200");
      tenantUnitsUrl.searchParams.set("status", "active");

      const tenantUnitsResponse = await fetch(tenantUnitsUrl.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!tenantUnitsResponse.ok) {
        return;
      }

      const tenantUnitsPayload = await tenantUnitsResponse.json();
      const tenantUnits = Array.isArray(tenantUnitsPayload?.data)
        ? tenantUnitsPayload.data
        : [];

      // Group tenant-units by unit_id
      const tenantUnitsByUnit = {};
      tenantUnits.forEach((tu) => {
        const unitId = tu?.unit?.id;
        if (unitId) {
          if (!tenantUnitsByUnit[unitId]) {
            tenantUnitsByUnit[unitId] = [];
          }
          tenantUnitsByUnit[unitId].push(tu);
        }
      });

      // Fetch pending charges for each tenant-unit
      for (const unit of unitsData) {
        const unitId = unit.id;
        const tenantUnitsForUnit = tenantUnitsByUnit[unitId] || [];

        if (tenantUnitsForUnit.length === 0) {
          chargesMap[unitId] = {};
          continue;
        }

        chargesMap[unitId] = {};

        for (const tenantUnit of tenantUnitsForUnit) {
          const tenantUnitId = tenantUnit.id;

          try {
            const chargesResponse = await fetch(
              `${API_BASE_URL}/tenant-units/${tenantUnitId}/pending-charges`,
              {
                signal: controller.signal,
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (chargesResponse.ok) {
              const chargesPayload = await chargesResponse.json();
              const charges = Array.isArray(chargesPayload?.data)
                ? chargesPayload.data
                : [];

              if (charges.length > 0) {
                chargesMap[unitId][tenantUnitId] = charges;
              }
            }
          } catch (err) {
            // Silently fail for individual charge fetches
            if (err.name !== "AbortError" && isMounted) {
              console.warn(
                `Failed to fetch charges for tenant-unit ${tenantUnitId}:`,
                err,
              );
            }
          }
        }
      }

      if (isMounted) {
        setUnitPendingCharges(chargesMap);
      }
    } catch (err) {
      if (err.name !== "AbortError" && isMounted) {
        console.warn("Failed to fetch tenant-units:", err);
      }
    }
  }

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return properties.find((p) => String(p.id) === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const hasPendingInvoices = useCallback(
    (unitId) => {
      const charges = unitPendingCharges[unitId];
      if (!charges) return false;

      // Check if any tenant-unit has pending charges
      return Object.values(charges).some(
        (chargeList) => chargeList && chargeList.length > 0,
      );
    },
    [unitPendingCharges],
  );

  const getPendingInvoiceCount = useCallback(
    (unitId) => {
      const charges = unitPendingCharges[unitId];
      if (!charges) return 0;

      return Object.values(charges).reduce(
        (total, chargeList) => total + (chargeList?.length || 0),
        0,
      );
    },
    [unitPendingCharges],
  );

  // Handle unit card click
  const handleUnitClick = useCallback(async (unit) => {
    setSelectedUnit(unit);
    setTenantUnitData(null);
    setLoadingTenantUnit(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        return;
      }

      // Fetch tenant-unit data for this unit
      const url = new URL(`${API_BASE_URL}/tenant-units`);
      url.searchParams.set("unit_id", unit.id);
      url.searchParams.set("status", "active");
      url.searchParams.set("per_page", "10");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setTenantUnitData(data.length > 0 ? data[0] : null);
      }
    } catch (err) {
      console.warn("Failed to fetch tenant-unit data:", err);
    } finally {
      setLoadingTenantUnit(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUnit(null);
    setTenantUnitData(null);
  }, []);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (!units.length) {
      return {
        total: 0,
        occupied: 0,
        vacant: 0,
        pending: 0,
      };
    }

    return units.reduce(
      (stats, unit) => {
        stats.total += 1;
        if (unit.is_occupied) {
          stats.occupied += 1;
        } else {
          stats.vacant += 1;
        }
        if (hasPendingInvoices(unit.id)) {
          stats.pending += 1;
        }
        return stats;
      },
      { total: 0, occupied: 0, vacant: 0, pending: 0 },
    );
  }, [units, hasPendingInvoices]);

  // Filter units based on search and status
  const filteredUnits = useMemo(() => {
    let filtered = units;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (unit) =>
          unit.unit_number?.toLowerCase().includes(query) ||
          unit.unit_type?.name?.toLowerCase().includes(query),
      );
    }

    // Status filter
    if (statusFilter === "occupied") {
      filtered = filtered.filter((unit) => unit.is_occupied);
    } else if (statusFilter === "vacant") {
      filtered = filtered.filter((unit) => !unit.is_occupied);
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((unit) => hasPendingInvoices(unit.id));
    }

    return filtered;
  }, [units, searchQuery, statusFilter, hasPendingInvoices]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-700 sm:text-2xl">
            <Home size={24} className="text-primary" />
            Property Snapshot
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quick overview of units and their status for a selected property.
          </p>
        </div>
      </header>

      {/* Property Selection - Sticky on Mobile */}
      <section className="sticky top-0 z-10 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:relative sm:bg-slate-50/80">
        <label
          htmlFor="property-select"
          className="mb-2 block text-sm font-semibold text-slate-500"
        >
          Select Property
        </label>
        {propertiesLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Loading properties...
          </div>
        ) : propertiesError ? (
          <div className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-500">
            {propertiesError}
          </div>
        ) : (
          <select
            id="property-select"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Select a property --</option>
            {properties.map((property) => (
              <option key={property.id} value={String(property.id)}>
                {property.name} {property.address ? `- ${property.address}` : ""}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Units Display */}
      {selectedPropertyId && (
        <section className="space-y-4">
          {selectedProperty && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm backdrop-blur">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                <Building2 size={20} className="text-primary" />
                {selectedProperty.name}
              </h2>
              {selectedProperty.address && (
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProperty.address}
                </p>
              )}
            </div>
          )}

          {/* Quick Stats Cards */}
          {!loading && units.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Total Units"
                value={quickStats.total}
                icon={<Home size={18} />}
                color="blue"
              />
              <StatCard
                label="Occupied"
                value={quickStats.occupied}
                icon={<CheckCircle2 size={18} />}
                color="green"
              />
              <StatCard
                label="Vacant"
                value={quickStats.vacant}
                icon={<XCircle size={18} />}
                color="yellow"
              />
              <StatCard
                label="Pending"
                value={quickStats.pending}
                icon={<AlertCircle size={18} />}
                color="red"
              />
            </div>
          )}

          {/* Search and Filter Bar */}
          {!loading && units.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2">
                {["all", "occupied", "vacant", "pending"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                      statusFilter === filter
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-slate-400 border border-slate-100"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 px-6 py-8 text-center">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <p className="mt-3 text-sm font-semibold text-red-500">
                {error}
              </p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-6 py-16 text-center">
              <Home size={48} className="text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                {units.length === 0
                  ? "No units found"
                  : "No units match your filters"}
              </p>
              <p className="text-sm text-slate-400">
                {units.length === 0
                  ? "This property doesn't have any units yet."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUnits.map((unit, index) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  hasPendingInvoices={hasPendingInvoices(unit.id)}
                  pendingInvoiceCount={getPendingInvoiceCount(unit.id)}
                  onClick={() => handleUnitClick(unit)}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!selectedPropertyId && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-6 py-16 text-center">
          <Building2 size={48} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">
            Select a property to view units
          </p>
          <p className="text-sm text-slate-400">
            Choose a property from the dropdown above to see its units and their
            status.
          </p>
        </div>
      )}

      {/* Unit Details Modal */}
      {selectedUnit && (
        <UnitDetailsModal
          unit={selectedUnit}
          tenantUnit={tenantUnitData}
          loading={loadingTenantUnit}
          hasPendingInvoices={hasPendingInvoices(selectedUnit.id)}
          pendingInvoiceCount={getPendingInvoiceCount(selectedUnit.id)}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-500 border-blue-100",
    green: "bg-green-50 text-green-500 border-green-100",
    yellow: "bg-yellow-50 text-yellow-500 border-yellow-100",
    red: "bg-red-50 text-red-500 border-red-100",
  };

  return (
    <div
      className={`rounded-xl border p-3 text-center transition hover:scale-105 ${colorClasses[color]}`}
    >
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-slate-100 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 w-24 rounded bg-slate-200"></div>
          <div className="mt-2 h-3 w-16 rounded bg-slate-200"></div>
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-200"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-slate-200"></div>
        <div className="h-4 w-3/4 rounded bg-slate-200"></div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-200"></div>
    </div>
  );
}

function UnitCard({
  unit,
  hasPendingInvoices,
  pendingInvoiceCount,
  onClick,
  index = 0,
}) {
  const isOccupied = Boolean(unit?.is_occupied);
  const unitNumber = unit?.unit_number ?? `Unit #${unit?.id}`;
  const unitType = unit?.unit_type?.name ?? "Not set";
  const rentAmount = unit?.rent_amount
    ? formatCurrency(unit.rent_amount)
    : "—";

  // Determine card background and border color based on status
  const getCardStyles = () => {
    if (hasPendingInvoices) {
      return {
        container: "bg-red-50",
        text: "text-slate-700",
        label: "text-slate-500",
      };
    }
    if (isOccupied) {
      return {
        container: "bg-green-50",
        text: "text-slate-700",
        label: "text-slate-500",
      };
    }
    return {
      container: "bg-yellow-50",
      text: "text-slate-700",
      label: "text-slate-500",
    };
  };

  const cardStyles = getCardStyles();

  return (
    <article
      onClick={onClick}
      className={`cursor-pointer rounded-2xl ${cardStyles.container} p-4 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]`}
      style={{
        animation: `fadeInUp 0.3s ease-out ${index * 50}ms both`,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${cardStyles.text}`}>{unitNumber}</h3>
          <p className={`mt-1 text-xs ${cardStyles.label}`}>{unitType}</p>
        </div>
        <StatusBadge isOccupied={isOccupied} />
      </div>

      {/* Details */}
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className={cardStyles.label}>Rent:</dt>
          <dd className={`font-semibold ${cardStyles.text}`}>{rentAmount}</dd>
        </div>
        {hasPendingInvoices && (
          <div className="flex items-center justify-between rounded-lg bg-red-100 px-3 py-2">
            <dt className="flex items-center gap-1.5 text-red-600">
              <FileText size={14} />
              Pending Invoices:
            </dt>
            <dd className="font-semibold text-red-700">
              {pendingInvoiceCount} {pendingInvoiceCount === 1 ? "invoice" : "invoices"}
            </dd>
          </div>
        )}
      </dl>

      {/* Status Indicator Bar */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className={`h-2 flex-1 rounded-full ${
            hasPendingInvoices
              ? "bg-red-300"
              : isOccupied
                ? "bg-green-300"
                : "bg-yellow-300"
          }`}
        />
        {hasPendingInvoices && (
          <AlertCircle size={16} className="text-red-500" />
        )}
        {isOccupied && !hasPendingInvoices && (
          <CheckCircle2 size={16} className="text-green-500" />
        )}
        {!isOccupied && !hasPendingInvoices && (
          <XCircle size={16} className="text-yellow-500" />
        )}
      </div>
    </article>
  );
}

function StatusBadge({ isOccupied }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        isOccupied
          ? "bg-green-50 text-green-500"
          : "bg-yellow-50 text-yellow-500"
      }`}
    >
      {isOccupied ? (
        <>
          <CheckCircle2 size={12} />
          Occupied
        </>
      ) : (
        <>
          <XCircle size={12} />
          Vacant
        </>
      )}
    </span>
  );
}

function UnitDetailsModal({
  unit,
  tenantUnit,
  loading,
  hasPendingInvoices,
  pendingInvoiceCount,
  onClose,
}) {
  const isOccupied = Boolean(unit?.is_occupied);
  const unitNumber = unit?.unit_number ?? `Unit #${unit?.id}`;
  const unitType = unit?.unit_type?.name ?? "Not set";
  const rentAmount = unit?.rent_amount ? formatCurrency(unit.rent_amount) : "—";
  const depositAmount = unit?.security_deposit
    ? formatCurrency(unit.security_deposit)
    : "—";
  const propertyId = unit?.property?.id;
  const propertyName = unit?.property?.name ?? "Unknown";
  const tenantName = tenantUnit?.tenant?.full_name;
  const tenantId = tenantUnit?.tenant?.id;
  const tenantUnitId = tenantUnit?.id;

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Determine modal background color based on status
  const getModalBgColor = () => {
    if (hasPendingInvoices) return "bg-red-50";
    if (isOccupied) return "bg-green-50";
    return "bg-yellow-50";
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isMobile
          ? "flex items-end"
          : "flex items-center justify-center p-2 sm:p-4"
      }`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${
          isMobile ? "animate-in fade-in" : ""
        }`}
      />

      {/* Modal - Bottom Sheet on Mobile, Center on Desktop */}
      <div
        className={`relative z-10 flex h-full max-h-[95vh] w-full flex-col ${
          isMobile
            ? "rounded-t-3xl slide-in-from-bottom"
            : "max-w-lg rounded-2xl sm:max-h-[90vh]"
        } ${getModalBgColor()} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle for Mobile */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-slate-400/50"></div>
          </div>
        )}
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md transition active:scale-95 sm:right-4 sm:top-4 sm:h-8 sm:w-8 sm:bg-transparent sm:shadow-none sm:hover:bg-black/10"
            aria-label="Close modal"
          >
            <X size={20} className="sm:w-5" />
          </button>

          {/* Header */}
          <div className="mb-4 pr-10 sm:mb-6 sm:pr-8">
            <h2 className="text-xl font-bold text-slate-700 sm:text-2xl">
              {unitNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{unitType}</p>
            <div className="mt-3">
              <StatusBadge isOccupied={isOccupied} />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 sm:space-y-4">
          <div className="rounded-xl bg-white/50 p-3 sm:p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
              Unit Information
            </h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <Building2 size={16} />
                  <span>Property:</span>
                </dt>
                <dd className="break-words font-semibold text-slate-600 sm:text-right">
                  {propertyName}
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <Wallet size={16} />
                  <span>Rent:</span>
                </dt>
                <dd className="font-semibold text-slate-600 sm:text-right">
                  {rentAmount}
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <Wallet size={16} />
                  <span>Security Deposit:</span>
                </dt>
                <dd className="font-semibold text-slate-600 sm:text-right">
                  {depositAmount}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tenant Information */}
          {loading ? (
            <div className="flex items-center justify-center rounded-xl bg-white/50 p-4">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : tenantUnit && tenantName ? (
            <div className="rounded-xl bg-white/50 p-3 sm:p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
                Tenant Information
              </h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="flex items-center gap-2 text-slate-400">
                    <User size={16} />
                    <span>Tenant:</span>
                  </dt>
                  <dd className="break-words font-semibold text-slate-600 sm:text-right">
                    {tenantName}
                  </dd>
                </div>
                {tenantUnit.lease_start && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="flex items-center gap-2 text-slate-400">
                      <Calendar size={16} />
                      <span>Lease Start:</span>
                    </dt>
                    <dd className="font-semibold text-slate-600 sm:text-right">
                      {new Date(tenantUnit.lease_start).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {tenantUnit.monthly_rent && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="flex items-center gap-2 text-slate-400">
                      <Wallet size={16} />
                      <span>Monthly Rent:</span>
                    </dt>
                    <dd className="font-semibold text-slate-600 sm:text-right">
                      {formatCurrency(tenantUnit.monthly_rent)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : null}

          {/* Pending Invoices Alert */}
          {hasPendingInvoices && (
            <div className="rounded-xl bg-red-100 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={18} className="flex-shrink-0 sm:w-5" />
                <p className="break-words text-sm font-semibold sm:text-base">
                  {pendingInvoiceCount} Pending Invoice
                  {pendingInvoiceCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Links Section */}
          <div className="rounded-xl bg-white/50 p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Quick Links
            </h3>
            <div className="space-y-2">
              {unit?.id && (
                <Link
                  href={`/units/${unit.id}`}
                  className="flex min-h-[44px] items-center justify-between rounded-lg bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition active:scale-[0.98] active:bg-slate-50 sm:px-4 sm:hover:bg-slate-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink size={16} />
                    View Unit Details
                  </span>
                  <ExternalLink size={14} className="text-slate-300" />
                </Link>
              )}
              {propertyId && (
                <Link
                  href={`/properties/${propertyId}`}
                  className="flex min-h-[44px] items-center justify-between rounded-lg bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition active:scale-[0.98] active:bg-slate-50 sm:px-4 sm:hover:bg-slate-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={16} />
                    View Property
                  </span>
                  <ExternalLink size={14} className="text-slate-300" />
                </Link>
              )}
              {unit?.id && (
                <Link
                  href={`/assets?unitId=${unit.id}`}
                  className="flex min-h-[44px] items-center justify-between rounded-lg bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition active:scale-[0.98] active:bg-slate-50 sm:px-4 sm:hover:bg-slate-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <Package size={16} />
                    View Assets
                  </span>
                  <ExternalLink size={14} className="text-slate-300" />
                </Link>
              )}
              {hasPendingInvoices && (
                <Link
                  href="/rent-invoices"
                  className="flex min-h-[44px] items-center justify-between rounded-lg bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition active:scale-[0.98] active:bg-red-100 sm:px-4 sm:hover:bg-red-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <FileText size={16} />
                    View Pending Invoices
                  </span>
                  <ExternalLink size={14} className="text-red-500" />
                </Link>
              )}
              {tenantId && (
                <Link
                  href={`/tenants/${tenantId}`}
                  className="flex min-h-[44px] items-center justify-between rounded-lg bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition active:scale-[0.98] active:bg-slate-50 sm:px-4 sm:hover:bg-slate-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    View Tenant Profile
                  </span>
                  <ExternalLink size={14} className="text-slate-300" />
                </Link>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  const amount = Number(value);

  if (value === null || value === undefined || Number.isNaN(amount)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `MVR ${formatted}`;
}


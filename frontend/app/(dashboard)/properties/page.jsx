"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Home,
  Factory,
  Search,
  AlertCircle,
  Plus,
  RefreshCcw,
  Trash2,
  Loader2,
  Users,
  UserX,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

const typeOptions = [
  { label: "All Types", value: "all" },
  { label: "Residential", value: "residential" },
  { label: "Commercial", value: "commercial" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProperties() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Please log in first.",
          );
        }

        const response = await fetch(`${API_BASE_URL}/properties`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          
          try {
            const payload = await response.json();
            errorMessage = payload?.message ?? payload?.error ?? errorMessage;
            
            // Add more context for common errors
            if (response.status === 401) {
              errorMessage = "Authentication failed. Please log in again.";
            } else if (response.status === 403) {
              errorMessage = "You don't have permission to view properties.";
            } else if (response.status === 404) {
              errorMessage = "Properties endpoint not found. Check API URL.";
            } else if (response.status >= 500) {
              errorMessage = "Server error. Please try again later.";
            }
          } catch (parseError) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || `HTTP ${response.status}`;
          }
          
          throw new Error(errorMessage);
        }

        const payload = await response.json();
        if (!isMounted) return;

        // Handle paginated response
        if (payload?.data && Array.isArray(payload.data)) {
          setProperties(payload.data);
        } else if (Array.isArray(payload)) {
          setProperties(payload);
        } else {
          setProperties([]);
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Handle network errors
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError(`Cannot connect to API server at ${API_BASE_URL}. Make sure the backend is running.`);
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchUnits() {
      setUnitsLoading(true);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          return;
        }

        // Fetch all units by using a large per_page value and handling pagination
        const url = new URL(`${API_BASE_URL}/units`);
        url.searchParams.set("per_page", "1000"); // Fetch all units for stats

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // Don't throw error, just use empty array for stats
          if (!isMounted) return;
          setUnits([]);
          return;
        }

        const payload = await response.json();
        if (!isMounted) return;

        // Handle paginated response structure
        let data = [];
        if (payload?.data && Array.isArray(payload.data)) {
          data = payload.data;
        } else if (Array.isArray(payload)) {
          data = payload;
        }

        setUnits(data);
      } catch (err) {
        if (!isMounted) return;
        // Silently fail for units, don't show error
        setUnits([]);
      } finally {
        if (isMounted) {
          setUnitsLoading(false);
        }
      }
    }

    fetchUnits();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesType =
        typeFilter === "all" ? true : property.type === typeFilter;

      const matchesQuery =
        query.length === 0
          ? true
          : [property.name, property.address, property.type]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(query));

      return matchesType && matchesQuery;
    });
  }, [properties, search, typeFilter]);

  const insights = useMemo(() => {
    if (!properties.length) {
      return {
        total: 0,
        residential: 0,
        commercial: 0,
        totalUnits: 0,
      };
    }

    return properties.reduce(
      (stats, property) => {
        const type = property.type ?? "unknown";
        const unitCount = property.units_count ?? 0;

        stats.total += 1;
        stats.totalUnits += unitCount;

        if (type === "residential") {
          stats.residential += 1;
        } else if (type === "commercial") {
          stats.commercial += 1;
        }

        return stats;
      },
      { total: 0, residential: 0, commercial: 0, totalUnits: 0 },
    );
  }, [properties]);

  const unitStats = useMemo(() => {
    const totals = units.reduce(
      (accumulator, unit) => {
        accumulator.total += 1;
        if (unit?.is_occupied) {
          accumulator.occupied += 1;
        }
        return accumulator;
      },
      { total: 0, occupied: 0 },
    );

    return {
      occupied: totals.occupied,
      unoccupied: Math.max(totals.total - totals.occupied, 0),
    };
  }, [units]);

  // Calculate unit stats per property
  const propertyUnitStats = useMemo(() => {
    const stats = {};
    
    units.forEach((unit) => {
      // Handle both string and number property_id
      const propertyId = unit?.property_id;
      if (!propertyId) return;
      
      // Normalize property_id to number for consistent key matching
      const normalizedPropertyId = Number(propertyId);
      if (isNaN(normalizedPropertyId)) return;
      
      if (!stats[normalizedPropertyId]) {
        stats[normalizedPropertyId] = {
          total: 0,
          vacant: 0,
        };
      }
      
      stats[normalizedPropertyId].total += 1;
      if (!unit?.is_occupied) {
        stats[normalizedPropertyId].vacant += 1;
      }
    });
    
    return stats;
  }, [units]);

  const handleDelete = useCallback(async (property) => {
    if (!property?.id) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete "${property.name ?? "this property"}"? This action cannot be undone.`,
    );

    if (!confirmDelete) {
      return;
    }

    const token = localStorage.getItem("auth_token");

    if (!token) {
      setActionError(
        "No API token found. Log in first so we can call the properties endpoint.",
      );
      return;
    }

    setDeletingId(property.id);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete this property (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setProperties((current) =>
        current.filter((item) => item.id !== property.id),
      );
      setActionMessage(
        property.name ? `Deleted "${property.name}".` : "Property deleted.",
      );
    } catch (err) {
      setActionError(err.message ?? "Failed to delete the property.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Building2 size={24} className="text-primary" />
            Properties
          </h1>
          <p className="text-sm text-slate-600">
            Overview of every property in your portfolio. Filter the list or add
            a new address.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/properties/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Add Property
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total Units Occupied"
          value={unitsLoading ? "..." : unitStats.occupied}
          icon={<Users size={20} />}
          tone="success"
        />
        <SummaryCard
          title="Total Units Unoccupied"
          value={unitsLoading ? "..." : unitStats.unoccupied}
          icon={<UserX size={20} />}
          tone="warning"
        />
        <SummaryCard
          title="Total Properties"
          value={insights.total}
          icon={<Building2 size={20} />}
        />
        <SummaryCard
          title="Residential"
          value={insights.residential}
          icon={<Home size={20} />}
        />
        <SummaryCard
          title="Commercial"
          value={insights.commercial}
          icon={<Factory size={20} />}
        />
        <SummaryCard
          title="Total Units"
          value={unitsLoading ? "..." : unitStats.occupied + unitStats.unoccupied}
          icon={<LayersIcon />}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, address, or type..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {error ? (
          <ErrorState message={error} />
        ) : filteredProperties.length === 0 && !loading ? (
          <EmptyState hasFilters={search.length > 0 || typeFilter !== "all"} />
        ) : (
          <DataDisplay
            data={filteredProperties}
            loading={loading}
            loadingMessage="Fetching properties…"
            emptyMessage={
              search.length > 0 || typeFilter !== "all"
                ? "No matches found"
                : "No properties yet"
            }
            columns={[
              {
                key: "id",
                label: "Property ID",
                render: (value) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {value ?? "N/A"}
                  </span>
                ),
              },
              {
                key: "name",
                label: "Property Name",
                render: (value, item) => (
                  <div>
                    <div className="font-semibold text-slate-900">{value}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} />
                      {item.address ?? "No address"}
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                label: "Type",
                render: (value) => (
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {value ?? "Unknown"}
                  </span>
                ),
              },
              {
                key: "total_units",
                label: "Total Unit",
                render: (_, item) => {
                  // Normalize property ID to number for consistent lookup
                  const propertyId = Number(item.id);
                  const stats = propertyUnitStats[propertyId] || { total: 0 };
                  const total = stats.total || item.units_count || 0;
                  return (
                    <span className="font-semibold text-slate-900">
                      {total}
                    </span>
                  );
                },
              },
              {
                key: "total_vacant",
                label: "Total Vacant",
                render: (_, item) => {
                  // Normalize property ID to number for consistent lookup
                  const propertyId = Number(item.id);
                  const stats = propertyUnitStats[propertyId] || { vacant: 0 };
                  const vacant = stats.vacant || 0;
                  return (
                    <span className="font-semibold text-slate-900">
                      {vacant}
                    </span>
                  );
                },
              },
              {
                key: "actions",
                label: "Actions",
                render: (_, item) => (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/properties/${item.id}`}
                      className="text-sm font-semibold text-primary transition hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                    <Link
                      href={`/properties/${item.id}/edit`}
                      className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                ),
              },
            ]}
            renderCard={(property) => (
              <PropertyCard
                property={property}
                propertyUnitStats={propertyUnitStats}
                onDelete={handleDelete}
                isDeleting={deletingId === property.id}
              />
            )}
            onRowClick={(property) => {
              window.location.href = `/properties/${property.id}`;
            }}
          />
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon, tone = "default" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${summaryTone(
        tone,
      )}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function summaryTone(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}

function PropertyCard({ property, propertyUnitStats, onDelete, isDeleting }) {
  // Calculate unit stats for this property
  const propertyId = Number(property.id);
  const stats = propertyUnitStats[propertyId] || { total: 0, vacant: 0 };
  const totalUnits = stats.total || property.units_count || 0;
  const vacantUnits = stats.vacant || 0;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {property.name}
            </h3>
            <span className="font-mono text-xs font-medium text-slate-500">
              ID: {property.id ?? "N/A"}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin size={14} />
            {property.address ?? "No address on file"}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {property.type ?? "Unknown"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Total Unit
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {totalUnits}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Total Vacant
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {vacantUnits}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/properties/${property.id}`}
          className="text-sm font-semibold text-primary transition hover:text-primary/80"
        >
          View details →
        </Link>
        <button
          type="button"
          onClick={() => onDelete?.(property)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Deleting…
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Delete
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching properties…
      </p>
      <p className="text-xs text-slate-500">
        This may take a moment if the API needs to wake up.
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load properties
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Make sure you are logged in and the API server is running at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {API_BASE_URL}
          </code>
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <RefreshCcw size={16} />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Building2 size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No matches found" : "No properties yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Add your first property to start tracking units, tenants, and leases."}
        </p>
      </div>
      <Link
        href="/properties/new"
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Plus size={16} />
        Add a property
      </Link>
    </div>
  );
}

function LayersIcon() {
  return (
    <svg
      className="h-5 w-5 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 7 9-4 9 4-9 4-9-4Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 12 9 4 9-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 17 9 4 9-4"
      />
    </svg>
  );
}


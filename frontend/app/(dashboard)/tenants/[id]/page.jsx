"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
  UserX,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import DocumentsPanel from "@/components/tenant/DocumentsPanel";
import { formatMVR } from "@/lib/currency";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function TenantDetailsPage({ params }) {
  const routeParams = use(params);
  const tenantId = routeParams?.id;
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [leaseHistory, setLeaseHistory] = useState([]);
  const [leasesLoading, setLeasesLoading] = useState(true);
  const [leasesError, setLeasesError] = useState(null);
  const [leasesPagination, setLeasesPagination] = useState({
    nextUrl: null,
  });
  const [leasesMeta, setLeasesMeta] = useState(null);
  const [isLoadingMoreLeases, setIsLoadingMoreLeases] = useState(false);

  const [propertyNames, setPropertyNames] = useState({});
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    const controller = new AbortController();

    async function fetchTenant() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load the tenant details.");
        }

        const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          throw new Error("We couldn't find that tenant.");
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load tenant (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        setTenant(payload?.data ?? null);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();

    return () => controller.abort();
  }, [tenantId, refreshKey]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    const controller = new AbortController();

    async function fetchLeases() {
      setLeasesLoading(true);
      setLeasesError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load lease history.");
        }

        const url = new URL(`${API_BASE_URL}/tenant-units`);
        url.searchParams.set("tenant_id", tenantId);
        url.searchParams.set("per_page", "25");

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
            `Unable to load lease history (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const leases = Array.isArray(payload?.data) ? payload.data : [];
        setLeaseHistory(leases);
        setLeasesMeta(payload?.meta ?? null);
        setLeasesPagination({
          nextUrl: payload?.links?.next ?? null,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setLeasesError(err.message);
      } finally {
        setLeasesLoading(false);
      }
    }

    fetchLeases();

    return () => controller.abort();
  }, [tenantId, refreshKey]);

  useEffect(() => {
    const propertyIds = new Set();

    if (Array.isArray(tenant?.active_leases)) {
      tenant.active_leases.forEach((lease) => {
        if (lease?.unit?.property_id) {
          propertyIds.add(lease.unit.property_id);
        }
      });
    }

    leaseHistory.forEach((lease) => {
      if (lease?.unit?.property_id) {
        propertyIds.add(lease.unit.property_id);
      }
    });

    const missingIds = Array.from(propertyIds).filter(
      (propertyId) => !propertyNames[propertyId],
    );

    if (missingIds.length === 0) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchProperties() {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        return;
      }

      const results = await Promise.allSettled(
        missingIds.map(async (propertyId) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/properties/${propertyId}`,
              {
                signal: controller.signal,
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (!response.ok) {
              return {
                propertyId,
                name: null,
              };
            }

            const payload = await response.json().catch(() => ({}));
            const name = payload?.data?.name ?? null;

            return {
              propertyId,
              name,
            };
          } catch (err) {
            return {
              propertyId,
              name: null,
            };
          }
        }),
      );

      if (!isMounted) {
        return;
      }

      setPropertyNames((previous) => {
        const next = { ...previous };

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            const { propertyId, name } = result.value;
            if (propertyId) {
              const label =
                name ??
                (previous[propertyId] ?? `Property #${propertyId}`);
              next[propertyId] = label;
            }
          }
        });

        return next;
      });
    }

    fetchProperties();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenant, leaseHistory, propertyNames]);

  const stats = useMemo(() => {
    if (!tenant) {
      return null;
    }

    const activeLeaseCount = Array.isArray(tenant.active_leases)
      ? tenant.active_leases.length
      : 0;

    return [
      {
        label: "Status",
        value: tenant.status ? capitalize(tenant.status) : "Unknown",
        icon: tenant.status === "active" ? UserCheck : UserX,
      },
      {
        label: "Email",
        value: tenant.email ?? "Not provided",
        icon: Mail,
      },
      {
        label: "Phone",
        value: tenant.phone ?? "Not provided",
        icon: Phone,
      },
      {
        label: "Active leases",
        value: activeLeaseCount,
        icon: FileText,
      },
    ];
  }, [tenant]);

  const activeLeases = useMemo(() => {
    if (!Array.isArray(tenant?.active_leases)) {
      return [];
    }

    return tenant.active_leases.sort((a, b) => {
      const endA = a?.lease_end ? new Date(a.lease_end).valueOf() : Infinity;
      const endB = b?.lease_end ? new Date(b.lease_end).valueOf() : Infinity;
      return endA - endB;
    });
  }, [tenant]);

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const hasLeaseRecords = useMemo(() => {
    const activeCount = Array.isArray(tenant?.active_leases)
      ? tenant.active_leases.length
      : 0;
    const historyCount = leaseHistory.length;
    const totalHistory = leasesMeta?.total ?? historyCount;

    return activeCount > 0 || historyCount > 0 || totalHistory > 0;
  }, [tenant, leaseHistory, leasesMeta]);

  const canDeleteTenant =
    tenant && !loading && !leasesLoading && !hasLeaseRecords;

  const handleLoadMoreLeases = async () => {
    if (!leasesPagination.nextUrl) {
      return;
    }

    setIsLoadingMoreLeases(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "Please log in so we can load additional lease history records.",
        );
      }

      const response = await fetch(leasesPagination.nextUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to load more leases (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setLeaseHistory((previous) => [...previous, ...data]);
      setLeasesMeta(payload?.meta ?? null);
      setLeasesPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      setLeasesError(err.message);
    } finally {
      setIsLoadingMoreLeases(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenantId || !canDeleteTenant || deleting) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this tenant? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before deleting a tenant.");
      }

      const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
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
          `Unable to delete tenant (HTTP ${response.status}).`;
        throw new Error(message);
      }

      router.push("/tenants");
      router.refresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const tenantName =
    tenant?.full_name ?? tenant?.email ?? `Tenant #${tenantId ?? "?"}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tenants"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back to tenants</span>
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Tenant detail
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Users size={22} className="text-primary" />
              {tenantName}
            </h1>
            <p className="text-sm text-slate-500">
              View contact information, identification, and lease assignments for
              this tenant.
            </p>
          </div>
        </div>

        {tenantId ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/tenants/${tenantId}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary"
            >
              <Pencil size={16} />
              Edit tenant
            </Link>
            {canDeleteTenant ? (
              <button
                type="button"
                onClick={handleDeleteTenant}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting…" : "Delete tenant"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        {deleteError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Unable to delete tenant.</p>
              <p className="mt-1 text-xs text-red-500">{deleteError}</p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : tenant ? (
          <div className="space-y-6">
            {stats?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <User size={16} className="text-primary" />
                    Contact information
                  </h2>
                  <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <InfoItem
                      icon={<Mail size={16} />}
                      label="Email"
                      value={tenant.email ?? "Not provided"}
                    />
                    <InfoItem
                      icon={<Phone size={16} />}
                      label="Primary phone"
                      value={tenant.phone ?? "Not provided"}
                    />
                    <InfoItem
                      icon={<Phone size={16} />}
                      label="Alternate phone"
                      value={tenant.alternate_phone ?? "—"}
                    />
                    <InfoItem
                      icon={<User size={16} />}
                      label="Nationality"
                      value={tenant.nationality?.name ?? "—"}
                    />
                    <InfoItem
                      icon={<CalendarClock size={16} />}
                      label="Created"
                      value={formatDate(tenant.created_at)}
                    />
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <Shield size={16} className="text-primary" />
                    Identification
                  </h2>
                  <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <InfoItem
                      icon={<Shield size={16} />}
                      label="ID proof type"
                      value={
                        tenant.id_proof_type
                          ? formatIdProofType(tenant.id_proof_type)
                          : "Not provided"
                      }
                    />
                    <InfoItem
                      icon={<FileText size={16} />}
                      label="ID proof number"
                      value={tenant.id_proof_number ?? "—"}
                    />
                    <InfoItem
                      icon={<User size={16} />}
                      label="Emergency contact"
                      value={
                        tenant.emergency_contact_name
                          ? tenant.emergency_contact_name
                          : "Not provided"
                      }
                    />
                    <InfoItem
                      icon={<Phone size={16} />}
                      label="Emergency phone"
                      value={tenant.emergency_contact_phone ?? "—"}
                    />
                    <InfoItem
                      icon={<Users size={16} />}
                      label="Contact relationship"
                      value={
                        tenant.emergency_contact_relationship
                          ? tenant.emergency_contact_relationship
                          : "Not provided"
                      }
                    />
                  </dl>
                </div>

                <DocumentsPanel
                  tenantId={tenantId}
                  onChanged={() => setRefreshKey((value) => value + 1)}
                />

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        <FileText size={16} className="text-primary" />
                        Active leases
                      </h2>
                      <p className="text-xs text-slate-500">
                        {activeLeases.length > 0
                          ? `Managing ${activeLeases.length} active ${
                              activeLeases.length === 1 ? "lease" : "leases"
                            }.`
                          : "No active leases for this tenant."}
                      </p>
                    </div>
                    <Link
                      href={`/tenant-units?tenantId=${tenantId}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
                    >
                      View all leases
                    </Link>
                  </div>

                  {activeLeases.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {activeLeases.map((lease) => {
                        const unitId = lease?.unit_id ?? lease?.unit?.id;
                        const unitLabel =
                          lease?.unit?.unit_number ??
                          (unitId ? `Unit #${unitId}` : "Unknown unit");
                        const propertyId = lease?.unit?.property_id;
                        const propertyLabel = propertyId
                          ? propertyNames[propertyId] ??
                            `Property #${propertyId}`
                          : "Unassigned property";

                        return (
                          <li
                            key={lease?.id}
                            className="rounded-xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-600"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {unitLabel}
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <MapPin size={14} />
                                  {propertyLabel}
                                </p>
                              </div>
                              <LeaseStatusBadge status={lease?.status} />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>
                                Start:{" "}
                                <span className="font-semibold">
                                  {formatDate(lease?.lease_start)}
                                </span>
                              </span>
                              <span>·</span>
                              <span>
                                End:{" "}
                                <span className="font-semibold">
                                  {formatDate(lease?.lease_end)}
                                </span>
                              </span>
                              <span>·</span>
                              <span>
                                Monthly rent:{" "}
                                <span className="font-semibold">
                                  {formatCurrency(lease?.monthly_rent)}
                                </span>
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                              {unitId ? (
                                <Link
                                  href={`/units/${unitId}`}
                                  className="font-semibold text-primary transition hover:text-primary/80"
                                >
                                  View unit →
                                </Link>
                              ) : null}
                              {propertyId ? (
                                <Link
                                  href={`/properties/${propertyId}`}
                                  className="font-semibold text-slate-500 transition hover:text-primary"
                                >
                                  View property
                                </Link>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">
                        No active leases.
                      </p>
                      <p className="mt-1">
                        Assign this tenant to a unit to begin tracking lease
                        terms and rent collection.
                      </p>
                    </div>
                  )}
                  {!leasesLoading ? (
                    hasLeaseRecords ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
                        Tenants with active or historical leases cannot be deleted.
                        End and archive all lease records first to enable deletion.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-700">
                        This tenant has no lease records yet. You can delete them
                        from the header actions if they are no longer needed.
                      </div>
                    )
                  ) : null}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarRange size={16} className="text-primary" />
                    Lease history
                  </h2>

                  {leasesLoading ? (
                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <p>Fetching lease assignments…</p>
                    </div>
                  ) : leasesError ? (
                    <div className="mt-6 space-y-3 rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-600">
                      <p className="font-semibold">We ran into a problem.</p>
                      <p className="text-xs text-red-500">{leasesError}</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
                      >
                        Try again
                      </button>
                    </div>
                  ) : leaseHistory.length > 0 ? (
                    <>
                      <ul className="mt-4 space-y-4 text-sm text-slate-600">
                        {leaseHistory.map((lease) => {
                          const unitId = lease?.unit_id ?? lease?.unit?.id;
                          const unitLabel =
                            lease?.unit?.unit_number ??
                            (unitId ? `Unit #${unitId}` : "Unknown unit");
                          const propertyId = lease?.unit?.property_id;
                          const propertyLabel = propertyId
                            ? propertyNames[propertyId] ??
                              `Property #${propertyId}`
                            : "Unassigned property";

                          return (
                            <li
                              key={lease?.id ?? `${unitId}-${lease?.lease_start}`}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {unitLabel}
                                  </p>
                                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    <MapPin size={14} />
                                    {propertyLabel}
                                  </p>
                                </div>
                                <LeaseStatusBadge status={lease?.status} />
                              </div>
                              <p className="mt-3 text-xs text-slate-500">
                                {formatDate(lease?.lease_start)} →{" "}
                                {formatDate(lease?.lease_end)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Deposit:{" "}
                                <span className="font-semibold">
                                  {formatCurrency(lease?.security_deposit_paid)}
                                </span>{" "}
                                · Advance rent:{" "}
                                <span className="font-semibold">
                                  {formatCurrency(lease?.advance_rent_amount)}
                                </span>
                              </p>
                            </li>
                          );
                        })}
                      </ul>

                      <footer className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <p>
                          Showing {leaseHistory.length} record
                          {leaseHistory.length === 1 ? "" : "s"}
                          {leasesMeta?.total
                            ? ` · ${leasesMeta.total} total`
                            : ""}
                        </p>
                        {leasesPagination.nextUrl ? (
                          <button
                            type="button"
                            onClick={handleLoadMoreLeases}
                            disabled={isLoadingMoreLeases}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoadingMoreLeases ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                Loading…
                              </>
                            ) : (
                              "Load more history"
                            )}
                          </button>
                        ) : null}
                      </footer>
                    </>
                  ) : (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">
                        No historical leases recorded yet.
                      </p>
                      <p className="mt-1">
                        Once this tenant is assigned to units, their previous
                        lease history will be listed here.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-xs text-slate-500">
                  <p>
                    Tenant ID:{" "}
                    <span className="font-semibold text-slate-700">
                      {tenant.id}
                    </span>
                  </p>
                  <p className="mt-1">
                    Last updated{" "}
                    <span className="font-semibold text-slate-700">
                      {formatDateTime(tenant.updated_at)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ErrorState message="Tenant data is missing." onRetry={handleRetry} />
        )}
      </section>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-white/80 p-3">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function LeaseStatusBadge({ status }) {
  const normalized = status ? status.toLowerCase() : "unknown";
  const styles = {
    active: "bg-success/10 text-success",
    inactive: "bg-warning/10 text-warning",
    former: "bg-danger/10 text-danger",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-slate-200 text-slate-700",
    terminated: "bg-danger/10 text-danger",
    unknown: "bg-slate-200 text-slate-600",
  };

  const label =
    normalized === "unknown"
      ? "Unknown"
      : normalized
          .split(/[_-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        styles[normalized] ?? styles.unknown
      }`}
    >
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching tenant details…
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load that tenant
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
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "N/A";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "N/A";
  }

  return date.toLocaleString();
}

function formatCurrency(value) {
  const amount = Number(value);

  if (value === null || value === undefined || Number.isNaN(amount)) {
    return "—";
  }

  return formatMVR(amount);
}

function formatIdProofType(value) {
  if (!value) {
    return "Not set";
  }

  const normalized = value.toString().toLowerCase();
  const labels = {
    aadhaar: "National ID",
    national_id: "National ID",
    passport: "Passport",
    other: "Other",
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return value
    .toString()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}



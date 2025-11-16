"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Boxes,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ownershipOptions = [
  { value: "all", label: "All ownership" },
  { value: "landlord", label: "Landlord-owned" },
  { value: "tenant", label: "Tenant-owned" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "working", label: "Working" },
  { value: "maintenance", label: "Maintenance" },
  { value: "broken", label: "Broken" },
];

const formStatusOptions = statusOptions.filter((option) => option.value !== "all");

const initialFormState = {
  asset_type_id: "",
  unit_id: "",
  ownership: "landlord",
  tenant_id: "",
  name: "",
  brand: "",
  model: "",
  location: "",
  installation_date: "",
  status: "working",
};

function toInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function getUnitLabel(unit) {
  if (!unit) {
    return "";
  }

  const unitNumber = normalizeString(unit?.unit_number);
  const propertyName = normalizeString(unit?.property?.name);

  if (unitNumber && propertyName) {
    return `${unitNumber} • ${propertyName}`;
  }

  if (unitNumber) {
    return unitNumber;
  }

  if (propertyName) {
    return propertyName;
  }

  if (unit?.id) {
    return `Unit #${unit.id}`;
  }

  return "";
}

function buildSuggestedAssetName({
  assetTypeId,
  unitId,
  assetTypeMap,
  unitMap,
  assets,
}) {
  const typeId = toInteger(assetTypeId);
  const unitIdNumber = toInteger(unitId);

  const type = typeId !== null ? assetTypeMap.get(typeId) : null;
  const unit = unitIdNumber !== null ? unitMap.get(unitIdNumber) : null;

  const typeName = normalizeString(type?.name);
  const unitLabel = getUnitLabel(unit);

  if (!typeName && !unitLabel) {
    return "";
  }

  let baseName = typeName || "Asset";

  if (unitLabel) {
    baseName = `${baseName} - ${unitLabel}`;
  }

  if (typeId !== null && unitIdNumber !== null) {
    const existingCount = assets.filter(
      (item) =>
        toInteger(item?.asset_type_id) === typeId &&
        toInteger(item?.unit_id) === unitIdNumber,
    ).length;

    if (existingCount > 0) {
      return `${baseName} (${existingCount + 1})`;
    }
  }

  return baseName;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");

  const [assetTypes, setAssetTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [formValues, setFormValues] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);
  const [formNameDirty, setFormNameDirty] = useState(false);
  const [lockedUnitId, setLockedUnitId] = useState(null);

  const [flashMessage, setFlashMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const searchParams = useSearchParams();
  const [prefillHandled, setPrefillHandled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchAssets() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load your assets.",
          );
        }

        const url = new URL(`${API_BASE_URL}/assets`);
        url.searchParams.set("per_page", "50");

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
            `Unable to load assets (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setAssets(data);
        setMeta(payload?.meta ?? null);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) return;

        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAssets();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load asset helpers.",
          );
        }

        const [assetTypesResponse, unitsResponse, tenantsResponse] =
          await Promise.all([
            fetchCollection(`${API_BASE_URL}/asset-types`, token, controller, {
              per_page: 100,
            }),
            fetchCollection(`${API_BASE_URL}/units`, token, controller, {
              per_page: 100,
            }),
            fetchCollection(`${API_BASE_URL}/tenants`, token, controller, {
              per_page: 100,
            }),
          ]);

        if (!isMounted) return;

        setAssetTypes(assetTypesResponse);
        setUnits(unitsResponse);
        setTenants(tenantsResponse);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) return;

        setOptionsError(err.message);
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    }

    fetchOptions();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const assetTypeMap = useMemo(() => {
    return assetTypes.reduce((accumulator, item) => {
      if (item?.id) {
        accumulator.set(item.id, item);
      }
      return accumulator;
    }, new Map());
  }, [assetTypes]);

  const unitMap = useMemo(() => {
    return units.reduce((accumulator, unit) => {
      if (unit?.id) {
        accumulator.set(unit.id, unit);
      }
      return accumulator;
    }, new Map());
  }, [units]);

  const tenantMap = useMemo(() => {
    return tenants.reduce((accumulator, tenant) => {
      if (tenant?.id) {
        accumulator.set(tenant.id, tenant);
      }
      return accumulator;
    }, new Map());
  }, [tenants]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesStatus =
        statusFilter === "all" ? true : asset?.status === statusFilter;

      const matchesOwnership =
        ownershipFilter === "all"
          ? true
          : (asset?.ownership ?? "landlord") === ownershipFilter;

      const matchesSearch =
        query.length === 0
          ? true
          : [
              asset?.name,
              asset?.brand,
              asset?.model,
              assetTypeMap.get(asset?.asset_type_id)?.name,
              asset?.asset_type?.name,
              unitMap.get(asset?.unit_id)?.unit_number,
              asset?.unit?.unit_number,
              tenantMap.get(asset?.tenant_id)?.full_name,
              asset?.tenant?.full_name,
            ]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(query));

      return matchesStatus && matchesOwnership && matchesSearch;
    });
  }, [
    assets,
    search,
    statusFilter,
    ownershipFilter,
    assetTypeMap,
    unitMap,
    tenantMap,
  ]);

  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    ownershipFilter !== "all";

  const stats = useMemo(() => {
    return assets.reduce(
      (accumulator, asset) => {
        accumulator.total += 1;

        const status = asset?.status ?? "working";
        if (status === "working") {
          accumulator.working += 1;
        } else if (status === "maintenance") {
          accumulator.maintenance += 1;
        } else if (status === "broken") {
          accumulator.broken += 1;
        }

        const ownership = asset?.ownership ?? "landlord";
        if (ownership === "tenant") {
          accumulator.tenantOwned += 1;
        } else {
          accumulator.landlordOwned += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        working: 0,
        maintenance: 0,
        broken: 0,
        landlordOwned: 0,
        tenantOwned: 0,
      },
    );
  }, [assets]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOwnershipFilter("all");
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleLoadMore = async () => {
    if (!pagination.nextUrl) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "No API token found. Log in first so we can load additional assets.",
        );
      }

      const response = await fetch(pagination.nextUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to load more assets (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setAssets((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const merged = [...previous];

        data.forEach((item) => {
          if (item?.id && !existingIds.has(item.id)) {
            merged.push(item);
          }
        });

        return merged;
      });

      setMeta(payload?.meta ?? null);
      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      setLoadMoreError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openCreateForm = useCallback((overrides = {}) => {
    setFormMode("create");
    setActiveAssetId(null);
    const nextValues = { ...initialFormState, ...overrides };
    setFormValues(nextValues);
    const overrideName = overrides?.name;
    const hasCustomName =
      typeof overrideName === "string" && overrideName.trim().length > 0;
    setFormNameDirty(hasCustomName);
    setFormErrors({});
    setFormApiError(null);
    const nextLockedUnitId = nextValues.unit_id
      ? String(nextValues.unit_id)
      : null;
    setLockedUnitId(nextLockedUnitId);
    setFormOpen(true);
  }, []);

  const openEditForm = (asset) => {
    if (!asset) {
      return;
    }

    setFormMode("edit");
    setActiveAssetId(asset.id);
    setFormErrors({});
    setFormApiError(null);
    setLockedUnitId(null);
    setFormValues({
      asset_type_id: asset.asset_type_id ? String(asset.asset_type_id) : "",
      unit_id: asset.unit_id ? String(asset.unit_id) : "",
      ownership: asset.ownership ?? "landlord",
      tenant_id: asset.tenant_id ? String(asset.tenant_id) : "",
      name: asset.name ?? "",
      brand: asset.brand ?? "",
      model: asset.model ?? "",
      location: asset.location ?? "",
      installation_date: asset.installation_date ?? "",
      status: asset.status ?? "working",
    });
    setFormNameDirty(true);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setFormOpen(false);
    setFormApiError(null);
    setFormErrors({});
    setFormNameDirty(false);
    setLockedUnitId(null);
  };

  const handleFormChange = (name, value) => {
    if (name === "name") {
      setFormNameDirty(true);
    }

    setFormErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormValues((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "ownership" && value !== "tenant") {
        next.tenant_id = "";
      }

      return next;
    });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (formSubmitting) {
      return;
    }

    setFormSubmitting(true);
    setFormErrors({});
    setFormApiError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before managing assets.");
      }

      const payload = buildAssetPayload(formValues);
      const isEdit = formMode === "edit" && activeAssetId;

      const response = await fetch(
        isEdit
          ? `${API_BASE_URL}/assets/${activeAssetId}`
          : `${API_BASE_URL}/assets`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 422) {
        const validationPayload = await response.json();
        setFormErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to ${isEdit ? "update" : "create"} asset (HTTP ${
            response.status
          }).`;
        throw new Error(message);
      }

      const result = await response.json();
      const asset = result?.data ?? result;

      if (isEdit) {
        setAssets((previous) =>
          previous.map((item) => (item.id === asset.id ? asset : item)),
        );
        setFlashMessage("Asset updated successfully.");
      } else {
        setAssets((previous) => [asset, ...previous]);
        setMeta((previous) =>
          previous
            ? { ...previous, total: (previous.total ?? 0) + 1 }
            : previous,
        );
        setFlashMessage("Asset created successfully.");
      }

      setFormOpen(false);
      setFormValues(initialFormState);
      setFormNameDirty(false);
      setActiveAssetId(null);
      setLockedUnitId(null);
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!assetId || deletingId) {
      return;
    }

    const asset = assets.find((item) => item.id === assetId);
    const label = asset?.name ?? `Asset #${assetId}`;

    const confirmed = window.confirm(
      `Delete ${label}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(assetId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before deleting assets.");
      }

      const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete asset (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setAssets((previous) => previous.filter((item) => item.id !== assetId));
      setMeta((previous) =>
        previous
          ? {
              ...previous,
              total: Math.max((previous.total ?? 1) - 1, 0),
            }
          : previous,
      );
      setFlashMessage("Asset deleted.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!flashMessage) return;

    const timeout = setTimeout(() => {
      setFlashMessage(null);
    }, 3200);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  useEffect(() => {
    if (prefillHandled || !searchParams) {
      return;
    }

    const createParam =
      searchParams.get("createAsset") ?? searchParams.get("create_asset");

    if (createParam === null) {
      return;
    }

    const unitParam =
      searchParams.get("unitId") ??
      searchParams.get("unit_id") ??
      searchParams.get("unit");
    const assetTypeParam =
      searchParams.get("assetTypeId") ??
      searchParams.get("asset_type_id") ??
      searchParams.get("assetType");

    const overrides = {};

    if (unitParam) {
      overrides.unit_id = String(unitParam);
    }

    if (assetTypeParam) {
      overrides.asset_type_id = String(assetTypeParam);
    }

    openCreateForm(overrides);
    setPrefillHandled(true);
  }, [searchParams, prefillHandled, openCreateForm]);

  const tenantSelectOptions = useMemo(() => {
    return tenants
      .map((tenant) => ({
        value: String(tenant.id),
        label: tenant.full_name ?? `Tenant #${tenant.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenants]);

  const unitSelectOptions = useMemo(() => {
    return units
      .map((unit) => {
        const propertyName = unit?.property?.name;
        const unitNumber =
          unit?.unit_number ?? (unit?.id ? `Unit #${unit.id}` : "Unit");
        const label = propertyName
          ? `${unitNumber} • ${propertyName}`
          : unitNumber;

        return {
          value: String(unit.id),
          label,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [units]);

  const lockedUnitOption = useMemo(() => {
    if (!lockedUnitId) {
      return null;
    }

    return (
      unitSelectOptions.find((option) => option.value === lockedUnitId) ?? null
    );
  }, [lockedUnitId, unitSelectOptions]);

  const assetTypeSelectOptions = useMemo(() => {
    return assetTypes
      .map((type) => ({
        value: String(type.id),
        label: type.name ?? `Type #${type.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assetTypes]);

  const autoSuggestedName = useMemo(() => {
    if (formMode !== "create") {
      return "";
    }

    return buildSuggestedAssetName({
      assetTypeId: formValues.asset_type_id,
      unitId: formValues.unit_id,
      assetTypeMap,
      unitMap,
      assets,
    });
  }, [
    formMode,
    formValues.asset_type_id,
    formValues.unit_id,
    assetTypeMap,
    unitMap,
    assets,
  ]);

  useEffect(() => {
    if (!formOpen || formMode !== "create" || formNameDirty) {
      return;
    }

    setFormValues((previous) => {
      const nextName = autoSuggestedName ?? "";
      if (previous.name === nextName) {
        return previous;
      }

      return { ...previous, name: nextName };
    });
  }, [formOpen, formMode, formNameDirty, autoSuggestedName]);

  const handleUseSuggestedName = useCallback(() => {
    if (formMode !== "create") {
      return;
    }

    const nextName = autoSuggestedName ?? "";
    if (!nextName) {
      return;
    }

    setFormNameDirty(false);
    setFormValues((previous) => {
      if (previous.name === nextName) {
        return previous;
      }

      return { ...previous, name: nextName };
    });
  }, [formMode, autoSuggestedName]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Boxes size={24} className="text-primary" />
            Assets
          </h1>
          <p className="text-sm text-slate-600">
            Track every asset installed across your units. Manage lifecycles,
            ownership, and maintenance status from a single place.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus size={16} />
          Add asset
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total assets" value={stats.total} />
        <SummaryCard title="Working" value={stats.working} tone="success" />
        <SummaryCard
          title="Under maintenance"
          value={stats.maintenance}
          tone="warning"
        />
        <SummaryCard title="Tenant owned" value={stats.tenantOwned} tone="info" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, model, type, or unit…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={ownershipFilter}
            onChange={(event) => setOwnershipFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {ownershipOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>

        {optionsError ? (
          <p className="mt-3 text-xs text-red-500">
            {optionsError} — form selections may be limited.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-700">
            {flashMessage}
          </div>
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : filteredAssets.length === 0 && !loading ? (
          <EmptyState hasFilters={hasFilters} onCreate={openCreateForm} />
        ) : (
          <>
            <DataDisplay
              data={filteredAssets}
              loading={loading}
              loadingMessage="Fetching assets…"
              emptyMessage={
                hasFilters
                  ? "No assets match your filters"
                  : "No assets yet"
              }
              columns={[
                {
                  key: "name",
                  label: "Asset",
                  render: (value, item) => (
                    <div>
                      <div className="font-semibold text-slate-900">{value}</div>
                      {[item?.brand, item?.model].filter(Boolean).length > 0 && (
                        <div className="text-xs text-slate-500">
                          {[item?.brand, item?.model].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {item?.location && (
                        <div className="text-xs text-slate-400">{item.location}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "asset_type",
                  label: "Type",
                  render: (_, item) => {
                    const assetType =
                      item?.asset_type ??
                      (item?.asset_type_id ? assetTypeMap.get(item.asset_type_id) : null);
                    return (
                      <div>
                        <div className="font-medium text-slate-800">
                          {assetType?.name ?? "—"}
                        </div>
                        {assetType?.category && (
                          <div className="text-xs text-slate-500">{assetType.category}</div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "unit",
                  label: "Unit",
                  render: (_, item) => {
                    const unit =
                      item?.unit ?? (item?.unit_id ? unitMap.get(item.unit_id) : null);
                    const unitLabel = unit
                      ? unit.unit_number ??
                        (unit.id ? `Unit #${unit.id}` : "Unassigned unit")
                      : "Unassigned unit";
                    const propertyName = unit?.property?.name;
                    return (
                      <div>
                        {unit?.id ? (
                          <Link
                            href={`/units/${unit.id}`}
                            className="font-semibold text-primary transition hover:text-primary/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {unitLabel}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-700">{unitLabel}</span>
                        )}
                        {propertyName && (
                          <div className="text-xs text-slate-500">{propertyName}</div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "ownership",
                  label: "Ownership",
                  render: (value, item) => {
                    const ownership = value ?? "landlord";
                    const tenant =
                      item?.tenant ??
                      (item?.tenant_id ? tenantMap.get(item.tenant_id) : null);
                    return (
                      <div>
                        <OwnershipBadge ownership={ownership} />
                        {ownership === "tenant" && tenant && (
                          <div className="mt-1">
                            {tenant?.id ? (
                              <Link
                                href={`/tenants/${tenant.id}`}
                                className="text-xs font-semibold text-primary transition hover:text-primary/80"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {tenant.full_name}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-500">{tenant.full_name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <StatusBadge status={value ?? "working"} />,
                },
                {
                  key: "installation_date",
                  label: "Installed",
                  render: (value) => (
                    <span className="text-sm text-slate-600">
                      {value ? formatDate(value) : "—"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(item);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ),
                },
              ]}
              renderCard={(asset) => (
                <AssetCard
                  asset={asset}
                  assetTypeMap={assetTypeMap}
                  unitMap={unitMap}
                  tenantMap={tenantMap}
                  onEdit={() => openEditForm(asset)}
                  onDelete={() => handleDelete(asset.id)}
                  deleting={deletingId === asset.id}
                />
              )}
              onRowClick={(asset) => {
                openEditForm(asset);
              }}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>
                Showing {filteredAssets.length} of {assets.length} loaded assets
                {meta?.total ? ` · ${meta.total} total` : ""}
              </p>

              {pagination.nextUrl ? (
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  {loadMoreError ? (
                    <p className="text-xs text-red-500 sm:order-2 sm:pl-3">
                      {loadMoreError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <RefreshCcw size={16} />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </section>

      {formOpen ? (
        <AssetFormDialog
          mode={formMode}
          values={formValues}
          errors={formErrors}
          submitting={formSubmitting}
          apiError={formApiError}
          onClose={closeForm}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          autoSuggestedName={autoSuggestedName}
          nameManuallyEdited={formNameDirty}
          onUseSuggestedName={handleUseSuggestedName}
          assetTypeOptions={assetTypeSelectOptions}
          unitOptions={unitSelectOptions}
          lockedUnitId={lockedUnitId}
          lockedUnitOption={lockedUnitOption}
          tenantOptions={tenantSelectOptions}
          optionsLoading={optionsLoading}
        />
      ) : null}
    </div>
  );
}

function OwnershipPicker({ value, onChange, error }) {
  const options = [
    { value: "landlord", label: "Landlord owned", description: "Managed by landlord" },
    { value: "tenant", label: "Tenant owned", description: "Belongs to current tenant" },
  ];

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <label className="text-sm font-semibold text-slate-700">Ownership</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const checked = value === option.value;

          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-sm shadow-sm transition ${
                checked
                  ? "border-primary/60 bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"
              }`}
            >
              <input
                type="radio"
                name="ownership"
                value={option.value}
                checked={checked}
                onChange={(event) => onChange("ownership", event.target.value)}
                className="sr-only"
              />
              <span className="font-semibold">{option.label}</span>
              <p className="mt-1 text-xs text-slate-500">{option.description}</p>
            </label>
          );
        })}
      </div>
      {error ? <FieldError>{firstError(error)}</FieldError> : null}
    </div>
  );
}

function FormField({ label, htmlFor, children, error, required }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-slate-700"
      >
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {children}
      {error ? <FieldError>{firstError(error)}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }) {
  return <p className="text-xs font-medium text-red-500">{children}</p>;
}

function SummaryCard({ title, value, tone = "default" }) {
  const toneClasses = {
    default: "bg-white/70",
    success: "bg-emerald-50/80",
    warning: "bg-amber-50/80",
    info: "bg-sky-50/80",
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 ${toneClasses[tone] ?? toneClasses.default} p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    working: {
      label: "Working",
      className: "bg-success/10 text-success",
    },
    maintenance: {
      label: "Maintenance",
      className: "bg-warning/10 text-warning",
    },
    broken: {
      label: "Broken",
      className: "bg-danger/10 text-danger",
    },
  };

  const selected = config[status] ?? config.working;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${selected.className}`}
    >
      {selected.label}
    </span>
  );
}

function OwnershipBadge({ ownership }) {
  const config = {
    landlord: {
      label: "Landlord owned",
      className: "bg-primary/10 text-primary",
    },
    tenant: {
      label: "Tenant owned",
      className: "bg-slate-200 text-slate-700",
    },
  };

  const selected = config[ownership] ?? config.landlord;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${selected.className}`}
    >
      {selected.label}
    </span>
  );
}

function Loader({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-500">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <p className="text-xs text-slate-400">
        This may take a moment if the API needs to wake up.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load assets
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Make sure you are logged in and the API server is running at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{API_BASE_URL}</code>
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <RefreshCcw size={16} />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters, onCreate }) {
  const handleCreate = onCreate ?? (() => {});

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Boxes size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No assets match your filters" : "No assets yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Add your first asset to start tracking maintenance responsibilities."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Plus size={16} />
        Add an asset
      </button>
    </div>
  );
}

function formatDate(input) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString();
}

async function fetchCollection(endpoint, token, controller, query = {}) {
  const url = new URL(endpoint);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

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
      `Unable to load data from ${url.pathname} (HTTP ${response.status}).`;
    throw new Error(message);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

function buildAssetPayload(values) {
  const payload = {
    asset_type_id: values.asset_type_id ? Number(values.asset_type_id) : null,
    unit_id: values.unit_id ? Number(values.unit_id) : null,
    ownership: values.ownership ?? "landlord",
    tenant_id:
      values.ownership === "tenant" && values.tenant_id
        ? Number(values.tenant_id)
        : null,
    name: sanitizeString(values.name),
    brand: sanitizeString(values.brand),
    model: sanitizeString(values.model),
    location: sanitizeString(values.location),
    installation_date: values.installation_date || null,
    status: values.status ?? "working",
  };

  if (payload.ownership !== "tenant") {
    payload.tenant_id = null;
  }

  return payload;
}

function sanitizeString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstError(error) {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
}


function AssetRow({
  asset,
  assetTypeMap,
  unitMap,
  tenantMap,
  onEdit,
  onDelete,
  deleting,
}) {
  const assetType =
    asset?.asset_type ??
    (asset?.asset_type_id ? assetTypeMap.get(asset.asset_type_id) : null);
  const unit =
    asset?.unit ?? (asset?.unit_id ? unitMap.get(asset.unit_id) : null);
  const tenant =
    asset?.tenant ?? (asset?.tenant_id ? tenantMap.get(asset.tenant_id) : null);

  const unitLabel = unit
    ? unit.unit_number ??
      (unit.id ? `Unit #${unit.id}` : "Unassigned unit")
    : "Unassigned unit";

  const propertyName = unit?.property?.name;
  const status = asset?.status ?? "working";
  const ownership = asset?.ownership ?? "landlord";

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{asset?.name}</span>
          <span className="text-xs text-slate-500">
            {[asset?.brand, asset?.model].filter(Boolean).join(" · ")}
          </span>
          {asset?.location ? (
            <span className="text-xs text-slate-400">{asset.location}</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">
            {assetType?.name ?? "—"}
          </span>
          {assetType?.category ? (
            <span className="text-xs text-slate-500">{assetType.category}</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          {unit?.id ? (
            <Link
              href={`/units/${unit.id}`}
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              {unitLabel}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-slate-700">
              {unitLabel}
            </span>
          )}
          {propertyName ? (
            <span className="text-xs text-slate-500">{propertyName}</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <OwnershipBadge ownership={ownership} />
          {ownership === "tenant" && tenant ? (
            tenant?.id ? (
              <Link
                href={`/tenants/${tenant.id}`}
                className="text-xs font-semibold text-primary transition hover:text-primary/80"
              >
                {tenant.full_name}
              </Link>
            ) : (
              <span className="text-xs text-slate-500">{tenant.full_name}</span>
            )
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={status} />
      </td>
      <td className="px-3 py-3">
        <span className="text-sm text-slate-600">
          {asset?.installation_date
            ? formatDate(asset.installation_date)
            : "—"}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {deleting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AssetCard({
  asset,
  assetTypeMap,
  unitMap,
  tenantMap,
  onEdit,
  onDelete,
  deleting,
}) {
  const assetType =
    asset?.asset_type ??
    (asset?.asset_type_id ? assetTypeMap.get(asset.asset_type_id) : null);
  const unit =
    asset?.unit ?? (asset?.unit_id ? unitMap.get(asset.unit_id) : null);
  const tenant =
    asset?.tenant ?? (asset?.tenant_id ? tenantMap.get(asset.tenant_id) : null);

  const unitLabel = unit
    ? unit.unit_number ??
      (unit.id ? `Unit #${unit.id}` : "Unassigned unit")
    : "Unassigned unit";

  const propertyName = unit?.property?.name;
  const status = asset?.status ?? "working";
  const ownership = asset?.ownership ?? "landlord";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Asset
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{asset?.name}</h3>
          {[asset?.brand, asset?.model].filter(Boolean).length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {[asset?.brand, asset?.model].filter(Boolean).join(" · ")}
            </p>
          )}
          {asset?.location && (
            <p className="mt-1 text-xs text-slate-400">{asset.location}</p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Type</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {assetType?.name ?? "—"}
          </dd>
          {assetType?.category && (
            <dd className="text-xs text-slate-500">{assetType.category}</dd>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Unit</dt>
          <dd className="mt-1">
            {unit?.id ? (
              <Link
                href={`/units/${unit.id}`}
                className="font-semibold text-primary transition hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                {unitLabel}
              </Link>
            ) : (
              <span className="font-semibold text-slate-700">{unitLabel}</span>
            )}
          </dd>
          {propertyName && (
            <dd className="text-xs text-slate-500">{propertyName}</dd>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Ownership</dt>
            <dd className="mt-1">
              <OwnershipBadge ownership={ownership} />
            </dd>
            {ownership === "tenant" && tenant && (
              <dd className="mt-1">
                {tenant?.id ? (
                  <Link
                    href={`/tenants/${tenant.id}`}
                    className="text-xs font-semibold text-primary transition hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tenant.full_name}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">{tenant.full_name}</span>
                )}
              </dd>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Installed</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {asset?.installation_date ? formatDate(asset.installation_date) : "—"}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}

function AssetFormDialog({
  mode,
  values,
  errors,
  submitting,
  apiError,
  onClose,
  onChange,
  onSubmit,
  autoSuggestedName,
  nameManuallyEdited,
  onUseSuggestedName,
  assetTypeOptions,
  unitOptions,
  lockedUnitId,
  lockedUnitOption,
  tenantOptions,
  optionsLoading,
}) {
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {isEdit ? "Edit asset" : "Create asset"}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {isEdit ? "Update asset details" : "Register a new asset"}
          </h2>
          <p className="text-sm text-slate-600">
            {isEdit
              ? "Modify metadata, ownership, or maintenance state."
              : "Record a new asset for lifecycle tracking."}
          </p>
        </div>

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {optionsLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Loading supporting data…
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Asset name"
            htmlFor="name"
            error={errors?.name}
            required
          >
            <div className="space-y-1">
              <input
                id="name"
                name="name"
                value={values.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Air Conditioning Unit"
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {!isEdit ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {nameManuallyEdited
                      ? "Name customized. Adjust if needed."
                      : autoSuggestedName
                      ? "Auto-filled from the selected type and unit."
                      : "Pick a type and unit to auto-fill this name."}
                  </span>
                  {nameManuallyEdited && autoSuggestedName ? (
                    <button
                      type="button"
                      onClick={onUseSuggestedName}
                      className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-primary transition hover:border-primary/50 hover:text-primary/80"
                    >
                      Use suggestion
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Asset type"
              htmlFor="asset_type_id"
              error={errors?.asset_type_id}
              required
            >
              <select
                id="asset_type_id"
                name="asset_type_id"
                value={values.asset_type_id}
                onChange={(event) => onChange("asset_type_id", event.target.value)}
                required
                disabled={submitting || optionsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" disabled>
                  Select type
                </option>
                {assetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Unit"
              htmlFor="unit_id"
              error={errors?.unit_id}
              required
            >
              <>
                <select
                  id="unit_id"
                  name="unit_id"
                  value={values.unit_id}
                  onChange={(event) => onChange("unit_id", event.target.value)}
                  required
                  disabled={submitting || optionsLoading || Boolean(lockedUnitId)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select unit
                  </option>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {lockedUnitId ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Unit locked to{" "}
                    <span className="font-semibold text-slate-700">
                      {lockedUnitOption?.label ?? `Unit #${lockedUnitId}`}
                    </span>{" "}
                    because you started from that unit.
                  </p>
                ) : null}
              </>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Brand" htmlFor="brand" error={errors?.brand}>
              <input
                id="brand"
                name="brand"
                value={values.brand}
                onChange={(event) => onChange("brand", event.target.value)}
                placeholder="Daikin"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField label="Model" htmlFor="model" error={errors?.model}>
              <input
                id="model"
                name="model"
                value={values.model}
                onChange={(event) => onChange("model", event.target.value)}
                placeholder="VRV IV"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <FormField
            label="Location within unit"
            htmlFor="location"
            error={errors?.location}
          >
            <input
              id="location"
              name="location"
              value={values.location}
              onChange={(event) => onChange("location", event.target.value)}
              placeholder="Living room balcony"
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Installation date"
              htmlFor="installation_date"
              error={errors?.installation_date}
            >
              <input
                id="installation_date"
                name="installation_date"
                type="date"
                value={values.installation_date ?? ""}
                onChange={(event) =>
                  onChange("installation_date", event.target.value)
                }
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField label="Status" htmlFor="status" error={errors?.status}>
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={(event) => onChange("status", event.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <OwnershipPicker
            value={values.ownership}
            onChange={onChange}
            error={errors?.ownership}
          />

          {values.ownership === "tenant" ? (
            <FormField
              label="Owning tenant"
              htmlFor="tenant_id"
              error={errors?.tenant_id}
              required
            >
              <select
                id="tenant_id"
                name="tenant_id"
                value={values.tenant_id}
                onChange={(event) => onChange("tenant_id", event.target.value)}
                required
                disabled={submitting || optionsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" disabled>
                  Select tenant
                </option>
                {tenantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {isEdit ? "Save changes" : "Create asset"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


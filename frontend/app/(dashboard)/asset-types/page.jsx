"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const categoryOptions = [
  { value: "all", label: "All categories" },
  { value: "appliance", label: "Appliance" },
  { value: "furniture", label: "Furniture" },
  { value: "electronic", label: "Electronic" },
  { value: "fixture", label: "Fixture" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const initialFormState = {
  id: null,
  name: "",
  category: "appliance",
  is_active: true,
};

export default function AssetTypesPage() {
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formApiError, setFormApiError] = useState(null);

  const [flashMessage, setFlashMessage] = useState(null);
  const [flashType, setFlashType] = useState("info");
  const [flashDetails, setFlashDetails] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchAssetTypes() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load asset types.",
          );
        }

        const response = await fetch(`${API_BASE_URL}/asset-types?per_page=100`, {
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
            `Unable to load asset types (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        if (isMounted) {
          setAssetTypes(data);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAssetTypes();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!flashMessage) return;

    const timeout = setTimeout(() => {
      setFlashMessage(null);
      setFlashDetails([]);
      setFlashType("info");
    }, 3200);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const filteredAssetTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assetTypes.filter((type) => {
      const matchesCategory =
        categoryFilter === "all" ? true : type?.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? type?.is_active
            : !type?.is_active;

      const matchesSearch =
        query.length === 0
          ? true
          : [type?.name, type?.category]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(query));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [assetTypes, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    return assetTypes.reduce(
      (accumulator, type) => {
        accumulator.total += 1;
        if (type?.is_active) {
          accumulator.active += 1;
        } else {
          accumulator.inactive += 1;
        }

        const category = type?.category ?? "other";
        accumulator.categories[category] =
          (accumulator.categories[category] ?? 0) + 1;

        return accumulator;
      },
      { total: 0, active: 0, inactive: 0, categories: {} },
    );
  }, [assetTypes]);

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const openCreateForm = useCallback(() => {
    setFormValues(initialFormState);
    setFormErrors({});
    setFormApiError(null);
    setFormSubmitting(false);
    setFormOpen(true);
  }, []);

  const openEditForm = (assetType) => {
    if (!assetType) return;

    setFormValues({
      id: assetType.id,
      name: assetType.name ?? "",
      category: assetType.category ?? "appliance",
      is_active: Boolean(assetType.is_active),
    });
    setFormErrors({});
    setFormApiError(null);
    setFormSubmitting(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setFormOpen(false);
  };

  const handleFormChange = (name, value) => {
    setFormErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormValues((previous) => ({
      ...previous,
      [name]: value,
    }));
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
        throw new Error("You must be logged in before managing asset types.");
      }

      const payload = buildAssetTypePayload(formValues);
      const isEdit = Boolean(formValues.id);
      const endpoint = isEdit
        ? `${API_BASE_URL}/asset-types/${formValues.id}`
        : `${API_BASE_URL}/asset-types`;

      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        setFormErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to ${isEdit ? "update" : "create"} asset type (HTTP ${
            response.status
          }).`;
        throw new Error(message);
      }

      const result = await response.json();
      const assetType = result?.data ?? result;

      setAssetTypes((previous) => {
        if (isEdit) {
          return previous.map((item) =>
            item.id === assetType.id ? assetType : item,
          );
        }
        return [assetType, ...previous];
      });

      setFlashType("success");
      setFlashDetails([]);
      setFlashMessage(isEdit ? "Asset type updated." : "Asset type created.");
      setFormOpen(false);
      setFormValues(initialFormState);
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (assetTypeId) => {
    if (!assetTypeId || deletingId) {
      return;
    }

    const assetType = assetTypes.find((item) => item.id === assetTypeId);
    const label = assetType?.name ?? `Asset type #${assetTypeId}`;
    const confirmed = window.confirm(
      `Delete ${label}? Asset records referencing this type will block deletion if in use.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(assetTypeId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before deleting asset types.");
      }

      const response = await fetch(
        `${API_BASE_URL}/asset-types/${assetTypeId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const { summary, details } = parseApiErrorPayload(
          payload,
          `Unable to delete asset type (HTTP ${response.status}).`,
          response.status,
        );
        setFlashType("error");
        setFlashMessage(summary);
        setFlashDetails(details);
        return;
      }

      setAssetTypes((previous) =>
        previous.filter((item) => item.id !== assetTypeId),
      );
      setFlashType("success");
      setFlashDetails([]);
      setFlashMessage("Asset type deleted.");
    } catch (err) {
      setFlashType("error");
      setFlashMessage(err.message);
      setFlashDetails([]);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (assetType) => {
    if (!assetType) {
      return;
    }

    const token = localStorage.getItem("auth_token");

    if (!token) {
      setFlashType("error");
      setFlashMessage("You must be logged in before updating asset types.");
      setFlashDetails([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/asset-types/${assetType.id}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !assetType.is_active }),
        },
      );

      if (response.status === 422) {
        const payload = await response.json();
        const { summary, details } = parseApiErrorPayload(
          payload,
          payload?.message ?? "Validation issue.",
          response.status,
        );
        setFlashType("error");
        setFlashMessage(summary);
        setFlashDetails(details);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const { summary, details } = parseApiErrorPayload(
          payload,
          `Unable to update asset type (HTTP ${response.status}).`,
          response.status,
        );
        throw new ApiError(summary, details);
      }

      const result = await response.json();
      const updated = result?.data ?? result;

      setAssetTypes((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      setFlashType("success");
      setFlashDetails([]);
      setFlashMessage(
        updated.is_active ? "Asset type activated." : "Asset type archived.",
      );
    } catch (err) {
      const parsed =
        err instanceof ApiError
          ? err
          : new ApiError(err.message ?? "Unable to update asset type.");
      setFlashType("error");
      setFlashMessage(parsed.summary);
      setFlashDetails(parsed.details);
    }
  };

  const categoryBreakdown = useMemo(() => {
    const entries = Object.entries(stats.categories);
    if (!entries.length) {
      return null;
    }

    return entries
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats.categories]);

  const hasFilters =
    search.trim().length > 0 ||
    categoryFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers3 size={24} className="text-primary" />
            Asset Types
          </h1>
          <p className="text-sm text-slate-600">
            Define reusable asset templates to keep your unit inventories
            consistent and easier to report on.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus size={16} />
          New asset type
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total types"
          value={stats.total}
          icon={<Boxes size={18} />}
        />
        <SummaryCard
          title="Active types"
          value={stats.active}
          icon={<CheckCircle2 size={18} />}
          tone="success"
        />
        <SummaryCard
          title="Inactive"
          value={stats.inactive}
          icon={<Sparkles size={18} />}
          tone="muted"
          description={
            stats.inactive > 0
              ? "Archived types remain in history but cannot be assigned."
              : "All types are active."
          }
        />
      </section>

      {categoryBreakdown ? (
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Category breakdown
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categoryBreakdown.map((entry) => (
              <li
                key={entry.category}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500"
              >
                <p className="font-semibold text-slate-800 capitalize">
                  {entry.category}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {entry.count}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
              placeholder="Search by name or category…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

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

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <FlashBanner type={flashType} message={flashMessage} details={flashDetails} />
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : (
          <DataDisplay
            data={filteredAssetTypes}
            loading={loading}
            loadingMessage="Fetching asset types…"
            emptyMessage={
              hasFilters
                ? "No types match your filters"
                : "No asset types yet"
            }
            columns={[
              {
                key: "name",
                label: "Name",
                render: (value, item) => (
                  <div>
                    <div className="font-semibold text-slate-900">
                      {value ?? "Unnamed type"}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID {item?.id ?? "—"}
                    </div>
                  </div>
                ),
              },
              {
                key: "category",
                label: "Category",
                render: (value) => (
                  <span className="text-sm font-medium capitalize text-slate-800">
                    {value ?? "other"}
                  </span>
                ),
              },
              {
                key: "is_active",
                label: "Status",
                render: (_, item) => (
                  <StatusBadge active={Boolean(item?.is_active)} />
                ),
              },
              {
                key: "created_at",
                label: "Created",
                render: (value) => (
                  <span className="text-sm text-slate-600">
                    {value ? new Date(value).toLocaleDateString() : "—"}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (_, item) => (
                  <div className="flex flex-wrap items-center gap-2">
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
                        handleToggleActive(item);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        item?.is_active
                          ? "border-amber-200 text-amber-600 hover:border-amber-300 hover:text-amber-700"
                          : "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {item?.is_active ? "Archive" : "Activate"}
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
            renderCard={(assetType) => (
              <AssetTypeCard
                assetType={assetType}
                onEdit={() => openEditForm(assetType)}
                onDelete={() => handleDelete(assetType.id)}
                onToggleActive={() => handleToggleActive(assetType)}
                isDeleting={deletingId === assetType.id}
              />
            )}
            onRowClick={(assetType) => {
              openEditForm(assetType);
            }}
          />
        )}
      </section>

      {formOpen ? (
        <AssetTypeFormDialog
          values={formValues}
          errors={formErrors}
          submitting={formSubmitting}
          apiError={formApiError}
          onClose={closeForm}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </div>
  );
}

function AssetTypeCard({
  assetType,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
}) {
  const createdAt = assetType?.created_at
    ? new Date(assetType.created_at).toLocaleDateString()
    : "—";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Asset Type
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {assetType?.name ?? "Unnamed type"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">ID {assetType?.id ?? "—"}</p>
        </div>
        <StatusBadge active={Boolean(assetType?.is_active)} />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Category</dt>
          <dd className="mt-1 font-semibold capitalize text-slate-900">
            {assetType?.category ?? "other"}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Created</dt>
          <dd className="mt-1 font-semibold text-slate-900">{createdAt}</dd>
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
          onClick={onToggleActive}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            assetType?.is_active
              ? "border-amber-200 text-amber-600 hover:border-amber-300 hover:text-amber-700"
              : "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:text-emerald-700"
          }`}
        >
          {assetType?.is_active ? "Archive" : "Activate"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}

function AssetTypeFormDialog({
  values,
  errors,
  submitting,
  apiError,
  onClose,
  onChange,
  onSubmit,
}) {
  const isEdit = Boolean(values?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {isEdit ? "Edit asset type" : "Create asset type"}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {isEdit ? "Update reusable template" : "Register a new template"}
          </h2>
          <p className="text-sm text-slate-600">
            Asset types define the presets your team can assign when creating
            assets in units.
          </p>
        </div>

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="name" error={errors?.name} required>
            <input
              id="name"
              name="name"
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Air Conditioner"
              required
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Category"
              htmlFor="category"
              error={errors?.category}
              required
            >
              <select
                id="category"
                name="category"
                value={values.category}
                onChange={(event) => onChange("category", event.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {categoryOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="Status" htmlFor="is_active">
              <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(event) => onChange("is_active", event.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>
                  {values.is_active ? "Active and selectable" : "Archived / hidden"}
                </span>
              </label>
            </FormField>
          </div>

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
                <>{isEdit ? "Save changes" : "Create asset type"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, tone = "default", description }) {
  const toneClasses = {
    default: "bg-white/70",
    success: "bg-emerald-50/80",
    muted: "bg-slate-50/70",
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 ${toneClasses[tone] ?? toneClasses.default} p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {description ? (
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        active ? "bg-success/10 text-success" : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
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
          We couldn&apos;t load asset types
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
        <Layers3 size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No types match your filters" : "No asset types yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear the search to see more results."
            : "Create your first template to start assigning assets consistently."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Plus size={16} />
        New asset type
      </button>
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

function FlashBanner({ type, message, details }) {
  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    error: "border-red-200 bg-red-50/80 text-red-600",
    info: "border-slate-200 bg-slate-50/80 text-slate-700",
  };

  return (
    <div
      className={`border-b border-slate-100 px-5 py-3 text-sm ${
        toneClasses[type] ?? toneClasses.info
      }`}
    >
      <p className="font-semibold">{message}</p>
      {Array.isArray(details) && details.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          {details.map((item, index) => (
            <li key={index} className="text-slate-600">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function buildAssetTypePayload(values) {
  return {
    name: sanitizeString(values.name),
    category: values.category ?? "appliance",
    is_active: Boolean(values.is_active),
  };
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

class ApiError extends Error {
  constructor(summary, details = []) {
    super(summary);
    this.summary = summary;
    this.details = Array.isArray(details) ? details : [];
  }
}

function parseApiErrorPayload(payload, fallback, status) {
  const summary = payload?.message ?? fallback ?? "Request failed.";
  const details = [];

  if (payload?.errors && typeof payload.errors === "object") {
    Object.values(payload.errors).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => details.push(String(item)));
      } else if (value) {
        details.push(String(value));
      }
    });
  }

  if (payload?.error && typeof payload.error === "string") {
    details.push(payload.error);
  }

  if (payload?.data && typeof payload.data === "string") {
    details.push(payload.data);
  }

  if (status && !Number.isNaN(Number(status))) {
    details.push(`Status code: ${status}`);
  }

  return { summary, details };
}




"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Phone, Mail, Search, ShieldCheck } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchVendors() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) throw new Error("No API token found. Log in first.");

        const url = new URL(`${API_BASE_URL}/vendors`);
        url.searchParams.set("per_page", "1000");
        if (categoryFilter !== "all") {
          url.searchParams.set("service_category", categoryFilter);
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = payload?.message ?? `Unable to load vendors (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : payload?.data ?? payload ?? [];
        if (!isMounted) return;
        setVendors(data);
      } catch (err) {
        if (!isMounted || err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchVendors();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey, categoryFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => {
      return (
        v.name?.toLowerCase().includes(q) ||
        v.service_category?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q)
      );
    });
  }, [vendors, query]);

  const categories = useMemo(() => {
    const set = new Set(vendors.map((v) => v.service_category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [vendors]);

  const handleCreate = () => {
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this vendor?")) return;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("No API token found.");

      const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message ?? `Unable to delete vendor (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setRefreshKey((v) => v + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Directory</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <ShieldCheck size={24} className="text-primary" />
            Vendors
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Central registry of approved vendors. Use this directory to find the right contact by service category.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor, category, phone, email"
              className="min-w-[260px] rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <p className="text-sm text-slate-600">Loading vendors…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-600">No vendors found.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((v) => (
              <li key={v.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.service_category}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      {v.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} className="text-slate-400" />
                          {v.phone}
                        </span>
                      ) : null}
                      {v.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={14} className="text-slate-400" />
                          {v.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(v)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isModalOpen && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => {
            setIsModalOpen(false);
            setEditingVendor(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingVendor(null);
            setRefreshKey((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function VendorModal({ vendor, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: vendor?.name ?? "",
    service_category: vendor?.service_category ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    is_preferred: vendor?.is_preferred ?? false,
    notes: vendor?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("No API token found.");

      const url = vendor
        ? `${API_BASE_URL}/vendors/${vendor.id}`
        : `${API_BASE_URL}/vendors`;

      const response = await fetch(url, {
        method: vendor ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ?? `Unable to ${vendor ? "update" : "create"} vendor (HTTP ${response.status}).`;
        throw new Error(message);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {vendor ? "Edit vendor" : "Add vendor"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Service category <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.service_category}
                onChange={(e) =>
                  setFormData({ ...formData, service_category: e.target.value })
                }
                placeholder="e.g., HVAC, Plumbing, Electrical"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : vendor ? "Update Vendor" : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



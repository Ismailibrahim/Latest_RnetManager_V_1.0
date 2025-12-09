"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

export function RecordExpenseForm({ request, units, onSaved, onCancel }) {
  const [formData, setFormData] = useState({
    unit_id: request?.unit_id ?? "",
    description: request?.description ?? "",
    cost: request?.cost ?? "",
    asset_id: request?.asset_id ?? "",
    location: request?.location ?? "",
    serviced_by: request?.serviced_by ?? "",
    invoice_number: request?.invoice_number ?? "",
    type: request?.type ?? "repair",
    maintenance_date: request?.maintenance_date ?? "",
    is_billable: request?.is_billable ?? true,
    billed_to_tenant: request?.billed_to_tenant ?? false,
    tenant_share: request?.tenant_share ?? "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptPath, setExistingReceiptPath] = useState(request?.receipt_path ?? null);

  const fetchAssetsForUnit = useCallback(async (unitId) => {
    if (!unitId || unitId === "" || unitId === "0") {
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    setLoadingAssets(true);
    try {
      const url = new URL(`${API_BASE_URL}/assets`);
      url.searchParams.set("unit_id", String(unitId));
      url.searchParams.set("per_page", "1000");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.error("Failed to fetch assets:", {
          status: response.status,
          statusText: response.statusText,
          error: errorPayload,
        });
        setAssets([]);
        return;
      }

      const payload = await response.json();
      
      // Handle paginated response
      const data = Array.isArray(payload?.data) ? payload.data : [];
      setAssets(data);
    } catch (err) {
      console.error("Failed to fetch assets:", err);
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    // Fetch assets when component mounts with an existing request
    if (request?.unit_id) {
      fetchAssetsForUnit(request.unit_id);
    }
  }, [request?.unit_id, fetchAssetsForUnit]);

  useEffect(() => {
    // Fetch assets when unit_id changes in the form
    const unitId = formData.unit_id;
    if (unitId && unitId !== "" && unitId !== "0") {
      fetchAssetsForUnit(unitId);
      
    } else {
      setAssets([]);
      setFormData((prev) => ({ ...prev, asset_id: "" }));
    }
  }, [formData.unit_id, fetchAssetsForUnit, units]);

  // Auto-fill location when asset is selected
  useEffect(() => {
    if (formData.asset_id && formData.asset_id !== "") {
      const selectedAsset = assets.find((a) => String(a.id) === String(formData.asset_id));
      if (selectedAsset && selectedAsset.location) {
        // Only auto-fill if location is currently empty
        if (!formData.location || formData.location.trim() === "") {
          setFormData((prev) => ({ ...prev, location: selectedAsset.location }));
        }
      }
    }
  }, [formData.asset_id, assets, formData.location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("No API token found.");
      }

      const url = request
        ? `${API_BASE_URL}/maintenance-requests/${request.id}`
        : `${API_BASE_URL}/maintenance-requests`;

      // Use FormData if there's a file, otherwise use JSON
      const hasFile = receiptFile instanceof File;
      let body;
      let headers;

      if (hasFile) {
        const formDataObj = new FormData();
        formDataObj.append("unit_id", String(formData.unit_id));
        formDataObj.append("description", formData.description);
        formDataObj.append("cost", String(formData.cost));
        formDataObj.append("maintenance_date", formData.maintenance_date);
        formDataObj.append("type", formData.type);
        formDataObj.append("is_billable", formData.is_billable ? "1" : "0");
        formDataObj.append("billed_to_tenant", formData.billed_to_tenant ? "1" : "0");

        if (formData.asset_id) {
          formDataObj.append("asset_id", String(formData.asset_id));
        }

        if (formData.location) {
          formDataObj.append("location", formData.location);
        }

        if (formData.serviced_by) {
          formDataObj.append("serviced_by", formData.serviced_by);
        }

        if (formData.invoice_number) {
          formDataObj.append("invoice_number", formData.invoice_number);
        }

        if (formData.billed_to_tenant && formData.tenant_share) {
          formDataObj.append("tenant_share", String(formData.tenant_share));
        }

        formDataObj.append("receipt", receiptFile);
        body = formDataObj;
        headers = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };
      } else {
        const payload = {
          unit_id: Number(formData.unit_id),
          description: formData.description,
          cost: Number(formData.cost),
          maintenance_date: formData.maintenance_date,
          type: formData.type,
          is_billable: formData.is_billable,
          billed_to_tenant: formData.billed_to_tenant,
        };

        if (formData.asset_id) {
          payload.asset_id = Number(formData.asset_id);
        }

        if (formData.location) {
          payload.location = formData.location;
        }

        if (formData.serviced_by) {
          payload.serviced_by = formData.serviced_by;
        }

        if (formData.invoice_number) {
          payload.invoice_number = formData.invoice_number;
        }

        if (formData.billed_to_tenant && formData.tenant_share) {
          payload.tenant_share = Number(formData.tenant_share);
        }

        body = JSON.stringify(payload);
        headers = {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };
      }

      const response = await fetch(url, {
        method: request ? "PUT" : "POST",
        headers,
        body,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to ${request ? "update" : "create"} maintenance request (HTTP ${response.status}).`;
        throw new Error(message);
      }

      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.unit_id}
            onChange={(e) =>
              setFormData({ ...formData, unit_id: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_number ?? `Unit #${unit.id}`} -{" "}
                {unit.property?.name ?? "Unknown Property"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Describe the maintenance work performed..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cost (MVR) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              value={formData.maintenance_date}
              onChange={(e) =>
                setFormData({ ...formData, maintenance_date: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="repair">Repair</option>
              <option value="replacement">Replacement</option>
              <option value="service">Service</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Asset
            </label>
            <select
              value={formData.asset_id}
              onChange={(e) =>
                setFormData({ ...formData, asset_id: e.target.value })
              }
              disabled={!formData.unit_id || loadingAssets}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">No asset</option>
              {assets.length === 0 && !loadingAssets && formData.unit_id && (
                <option value="" disabled>
                  No assets found for this unit
                </option>
              )}
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                  {asset.location ? ` - ${asset.location}` : ""}
                </option>
              ))}
            </select>
            {loadingAssets && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                Loading assets...
              </p>
            )}
            {!loadingAssets && formData.unit_id && assets.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                No assets found for this unit
              </p>
            )}
            {!formData.unit_id && (
              <p className="mt-1 text-xs text-slate-500">
                Select a unit to load assets
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., Living room, Kitchen"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Serviced By
            </label>
            <input
              type="text"
              value={formData.serviced_by}
              onChange={(e) =>
                setFormData({ ...formData, serviced_by: e.target.value })
              }
              placeholder="Vendor/Contractor name"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vendor Invoice Number
          </label>
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) =>
              setFormData({ ...formData, invoice_number: e.target.value })
            }
            placeholder="Optional - external invoice number"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Receipt/Bill (Optional)
          </label>
          <div className="space-y-2">
            {existingReceiptPath && !receiptFile && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <FileText size={16} className="text-slate-500" />
                <span className="flex-1 text-sm text-slate-700">
                  Receipt uploaded
                </span>
                <a
                  href={`${API_BASE_URL.replace('/api/v1', '')}/storage/${existingReceiptPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => setExistingReceiptPath(null)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Remove receipt"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                <Upload size={16} className="text-slate-500" />
                <span className="flex-1">
                  {receiptFile ? receiptFile.name : "Choose file..."}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file size (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        setError("File size must be less than 10MB");
                        return;
                      }
                      // Validate file type
                      const allowedTypes = [
                        "application/pdf",
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                      ];
                      if (!allowedTypes.includes(file.type)) {
                        setError(
                          "Invalid file type. Please upload PDF, JPG, or PNG files only."
                        );
                        return;
                      }
                      setReceiptFile(file);
                      setError(null);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Upload PDF, JPG, or PNG files (max 10MB)
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Billing Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.is_billable}
                onChange={(e) =>
                  setFormData({ ...formData, is_billable: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">
                  Billable Expense
                </span>
                <p className="mt-0.5 text-xs text-slate-500">
                  Uncheck for non-billable expenses (e.g., routine inspection).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.billed_to_tenant}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billed_to_tenant: e.target.checked,
                  })
                }
                disabled={!formData.is_billable}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-700">
                  Billed to Tenant
                </span>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tenant will be charged. Create invoice separately to bill.
                </p>
              </div>
            </label>

            {formData.billed_to_tenant && (
              <div className="ml-7">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tenant Share (MVR) <span className="text-red-500">*</span>
                </label>
                <input
                  required={formData.billed_to_tenant}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tenant_share}
                  onChange={(e) =>
                    setFormData({ ...formData, tenant_share: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </span>
          ) : request ? (
            "Update Expense"
          ) : (
            "Record Expense"
          )}
        </button>
      </div>
    </form>
  );
}

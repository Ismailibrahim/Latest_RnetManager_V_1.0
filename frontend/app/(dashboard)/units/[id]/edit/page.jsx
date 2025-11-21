"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const initialFormState = {
  propertyId: "",
  unitTypeId: "",
  unitNumber: "",
  rentAmount: "",
  securityDeposit: "",
  isOccupied: false,
};

export default function EditUnitPage({ params }) {
  const routeParams = React.use(params);
  const unitId = routeParams?.id;
  const router = useRouter();

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [propertyOptionsError, setPropertyOptionsError] = useState(null);
  const [unitTypeOptions, setUnitTypeOptions] = useState([]);
  const [unitTypeOptionsError, setUnitTypeOptionsError] = useState(null);
  const [selectedDepositMultiplier, setSelectedDepositMultiplier] =
    useState(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState("create");
  const [typeModalName, setTypeModalName] = useState("");

  const ensureOptionIncluded = useCallback((options, id, label) => {
    if (!id) {
      return options;
    }

    const stringId = String(id);
    const exists = options.some((option) => option.value === stringId);

    if (exists) {
      return options;
    }

    return [...options, { value: stringId, label }];
  }, []);

  useEffect(() => {
    if (!unitId) {
      return;
    }

    const controller = new AbortController();

    async function fetchUnit() {
      setLoading(true);
      setApiError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in before editing a unit.");
        }

        const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          throw new Error("We couldn't find that unit.");
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load unit (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = payload?.data ?? {};

        setForm({
          propertyId: data.property_id ? String(data.property_id) : "",
          unitTypeId: data.unit_type?.id ? String(data.unit_type.id) : "",
          unitNumber: data.unit_number ?? "",
          rentAmount:
            data.rent_amount !== null && data.rent_amount !== undefined
              ? String(Number(data.rent_amount))
              : "",
          securityDeposit:
            data.security_deposit !== null &&
            data.security_deposit !== undefined
              ? String(Number(data.security_deposit))
              : "",
          isOccupied: Boolean(data.is_occupied),
        });

        // Ensure the current property and unit type are in the dropdowns.
        if (data.property_id && data.property?.name) {
          setPropertyOptions((current) =>
            ensureOptionIncluded(current, data.property_id, data.property.name),
          );
        }

        if (data.unit_type?.id && data.unit_type?.name) {
          setUnitTypeOptions((current) =>
            ensureOptionIncluded(current, data.unit_type.id, data.unit_type.name),
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setApiError(error.message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();

    return () => controller.abort();
  }, [ensureOptionIncluded, unitId]);

  useEffect(() => {
    if (selectedDepositMultiplier === null) return;

    setForm((prev) => {
      const rentValue = Number(prev.rentAmount);

      if (!Number.isFinite(rentValue) || rentValue <= 0) {
        if (prev.securityDeposit === "") {
          return prev;
        }

        return {
          ...prev,
          securityDeposit: "",
        };
      }

      const computed = rentValue * selectedDepositMultiplier;
      const nextValue = String(computed);

      if (prev.securityDeposit === nextValue) {
        return prev;
      }

      return {
        ...prev,
        securityDeposit: nextValue,
      };
    });
  }, [selectedDepositMultiplier, form.rentAmount]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProperties() {
      setPropertyOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setPropertyOptionsError(
            "Log in to load the property list. Existing selection stays available.",
          );
          return;
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
          setPropertyOptionsError(
            `${message} — existing selection stays available.`,
          );
          return;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const options = data
          .map((property) => ({
            value: String(property.id),
            label: property.name ?? `Property #${property.id ?? "?"}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );

        setPropertyOptions((current) => {
          const merged = [...current];
          options.forEach((option) => {
            if (!merged.some((item) => item.value === option.value)) {
              merged.push(option);
            }
          });

          return merged.sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setPropertyOptionsError(
          "Could not load additional properties. Check the API connection.",
        );
      }
    }

    fetchProperties();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUnitTypes() {
      setUnitTypeOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setUnitTypeOptionsError(
            "Log in to load unit types. Existing selection stays available.",
          );
          return;
        }

        const url = new URL(`${API_BASE_URL}/units`);
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
            payload?.message ?? `Unable to load unit types (HTTP ${response.status}).`;
          setUnitTypeOptionsError(
            `${message} — existing selection stays available.`,
          );
          return;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const map = new Map();

        data.forEach((unit) => {
          const type = unit?.unit_type;
          if (type?.id) {
            map.set(String(type.id), type.name ?? `Type #${type.id}`);
          }
        });

        const options = Array.from(map.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );

        setUnitTypeOptions((current) => {
          const merged = [...current];
          options.forEach((option) => {
            if (!merged.some((item) => item.value === option.value)) {
              merged.push(option);
            }
          });

          return merged.sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setUnitTypeOptionsError(
          "Could not load additional unit types. Check the API connection.",
        );
      }
    }

    fetchUnitTypes();

    return () => controller.abort();
  }, []);

  const sortedPropertyOptions = useMemo(
    () =>
      [...propertyOptions].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [propertyOptions],
  );

  const sortedUnitTypeOptions = useMemo(
    () =>
      [...unitTypeOptions].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [unitTypeOptions],
  );

  const securityDepositOptions = useMemo(
    () => [
      { label: "1 Month", value: 1 },
      { label: "2 Month", value: 2 },
      { label: "3 Month", value: 3 },
    ],
    [],
  );

  const fieldKeyMap = useMemo(
    () => ({
      propertyId: "property_id",
      unitTypeId: "unit_type_id",
      unitNumber: "unit_number",
      rentAmount: "rent_amount",
      securityDeposit: "security_deposit",
      isOccupied: "is_occupied",
    }),
    [],
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setValidationErrors((prev) => {
      if (!prev) {
        return prev;
      }

      const next = { ...prev };
      const apiKey = fieldKeyMap[name] ?? name;
      delete next[apiKey];
      return next;
    });
  };

  const handleDepositMultiplierChange = (value, isChecked) => {
    setSelectedDepositMultiplier((prev) => {
      if (isChecked) {
        return value;
      }

      if (prev === value) {
        return null;
      }

      return prev;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before editing a unit.");
      }

      const payload = {};

      if (form.propertyId) {
        payload.property_id = Number(form.propertyId);
      }

      if (form.unitTypeId) {
        payload.unit_type_id = Number(form.unitTypeId);
      }

      if (form.unitNumber.trim().length > 0) {
        payload.unit_number = form.unitNumber.trim();
      }

      if (form.rentAmount !== "") {
        payload.rent_amount = Number(form.rentAmount);
      }

      if (form.securityDeposit !== "") {
        payload.security_deposit = Number(form.securityDeposit);
      } else {
        payload.security_deposit = null;
      }

      payload.is_occupied = Boolean(form.isOccupied);

      const response = await fetch(`${API_BASE_URL}/units/${unitId}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const payload = await response.json();
        setValidationErrors(payload.errors ?? {});
        throw new Error(payload.message ?? "Validation error.");
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Could not update unit (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setSuccess(true);

      setTimeout(() => {
        router.push(`/units/${unitId}`);
        router.refresh();
      }, 1000);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/units/${unitId ?? ""}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Back to unit</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers size={24} className="text-primary" />
            Edit unit
          </h1>
          <p className="text-sm text-slate-600">
            Update the unit details. Changes sync instantly for your team.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-600">
              Fetching unit details…
            </p>
          </div>
        ) : (
          <>
            {apiError && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <p>{apiError}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                <p>Unit updated successfully.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Fieldset>
                <Label htmlFor="propertyId">Property</Label>
                <select
                  id="propertyId"
                  name="propertyId"
                  value={form.propertyId}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-describedby={
                    validationErrors.property_id ? "property-error" : undefined
                  }
                >
                  <option value="">Select a property…</option>
                  {sortedPropertyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {validationErrors.property_id && (
                  <FieldError id="property-error">
                    {validationErrors.property_id[0]}
                  </FieldError>
                )}
                {propertyOptionsError ? (
                  <p className="text-xs text-amber-600">{propertyOptionsError}</p>
                ) : null}
              </Fieldset>

              <Fieldset>
                <div className="flex items-center justify-between">
                  <Label htmlFor="unitTypeId">Unit type</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTypeModalMode("create");
                        setTypeModalName("");
                        setIsTypeModalOpen(true);
                      }}
                      className="text-xs font-semibold text-primary hover:text-primary/80"
                    >
                      + Add type
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.unitTypeId) {
                          alert("Select a unit type first to edit.");
                          return;
                        }
                        const current = unitTypeOptions.find(
                          (o) => o.value === String(form.unitTypeId),
                        );
                        setTypeModalMode("edit");
                        setTypeModalName(current?.label ?? "");
                        setIsTypeModalOpen(true);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-primary disabled:opacity-50"
                      disabled={!form.unitTypeId}
                      title={form.unitTypeId ? "Edit selected type" : "Select a type to edit"}
                    >
                      Edit type
                    </button>
                  </div>
                </div>
                <select
                  id="unitTypeId"
                  name="unitTypeId"
                  value={form.unitTypeId}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-describedby={
                    validationErrors.unit_type_id ? "unit-type-error" : undefined
                  }
                >
                  <option value="">Select a unit type…</option>
                  {sortedUnitTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {validationErrors.unit_type_id && (
                  <FieldError id="unit-type-error">
                    {validationErrors.unit_type_id[0]}
                  </FieldError>
                )}
                {unitTypeOptionsError ? (
                  <p className="text-xs text-amber-600">{unitTypeOptionsError}</p>
                ) : null}
              </Fieldset>

              <Fieldset>
                <Label htmlFor="unitNumber">Unit number</Label>
                <Input
                  id="unitNumber"
                  name="unitNumber"
                  placeholder="A-101"
                  value={form.unitNumber}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-describedby={
                    validationErrors.unit_number ? "unit-number-error" : undefined
                  }
                />
                {validationErrors.unit_number && (
                  <FieldError id="unit-number-error">
                    {validationErrors.unit_number[0]}
                  </FieldError>
                )}
              </Fieldset>

              <Fieldset>
                <Label htmlFor="rentAmount">Monthly rent (MVR)</Label>
                <Input
                  id="rentAmount"
                  name="rentAmount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="15000"
                  value={form.rentAmount}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-describedby={
                    validationErrors.rent_amount ? "rent-amount-error" : undefined
                  }
                />
                {validationErrors.rent_amount && (
                  <FieldError id="rent-amount-error">
                    {validationErrors.rent_amount[0]}
                  </FieldError>
                )}
              </Fieldset>

              <Fieldset>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label htmlFor="securityDeposit">Security deposit (MVR)</Label>
                  <div className="flex items-center gap-3">
                    {securityDepositOptions.map((option) => (
                      <label
                        key={option.value}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                          checked={selectedDepositMultiplier === option.value}
                          onChange={(event) =>
                            handleDepositMultiplierChange(
                              option.value,
                              event.target.checked,
                            )
                          }
                          disabled={submitting}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  id="securityDeposit"
                  name="securityDeposit"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="20000"
                  value={form.securityDeposit}
                  onChange={handleChange}
                  disabled={submitting}
                  readOnly={selectedDepositMultiplier !== null}
                  aria-describedby={
                    validationErrors.security_deposit
                      ? "security-deposit-error"
                      : undefined
                  }
                />
                {validationErrors.security_deposit && (
                  <FieldError id="security-deposit-error">
                    {validationErrors.security_deposit[0]}
                  </FieldError>
                )}
              </Fieldset>

              <Fieldset>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="isOccupied"
                    checked={form.isOccupied}
                    onChange={handleChange}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                  />
                  Mark as occupied
                </label>
                {validationErrors.is_occupied && (
                  <FieldError id="occupied-error">
                    {validationErrors.is_occupied[0]}
                  </FieldError>
                )}
              </Fieldset>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Link
                  href={`/units/${unitId ?? ""}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </Link>
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
                      <Layers size={16} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
      {isTypeModalOpen ? (
        <UnitTypeModal
          mode={typeModalMode}
          name={typeModalName}
          onNameChange={setTypeModalName}
          onClose={() => setIsTypeModalOpen(false)}
          onSave={async () => {
            const trimmed = typeModalName.trim();
            if (!trimmed) {
              alert("Please enter a name.");
              return;
            }
            // Client-side duplicate check (case-insensitive)
            const exists = unitTypeOptions.some((o) => {
              return (o?.label ?? "").trim().toLowerCase() === trimmed.toLowerCase();
            });
            if (typeModalMode === "create" && exists) {
              alert("A unit type with this name already exists.");
              return;
            }
            if (typeModalMode === "edit") {
              const currentId = String(form.unitTypeId || "");
              const existsOther = unitTypeOptions.some((o) => {
                if (!o) return false;
                const isOther = String(o.value) !== currentId;
                const sameName =
                  (o.label ?? "").trim().toLowerCase() === trimmed.toLowerCase();
                return isOther && sameName;
              });
              if (existsOther) {
                alert("Another unit type already uses this name.");
                return;
              }
            }
            try {
              const token = localStorage.getItem("auth_token");
              if (!token) {
                alert("Please log in to manage unit types.");
                return;
              }
              if (typeModalMode === "create") {
                const res = await fetch(`${API_BASE_URL}/unit-types`, {
                  method: "POST",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ name: trimmed, is_active: true }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  const message =
                    body?.errors?.name?.[0] ?? body?.message ?? "Failed to create unit type";
                  throw new Error(message);
                }
                const created = body?.data ?? body;
                if (created?.id && created?.name) {
                  const option = { value: String(created.id), label: created.name };
                  setUnitTypeOptions((prev) => {
                    const next = [...prev];
                    if (!next.some((o) => o.value === option.value)) next.push(option);
                    return next.sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
                    );
                  });
                  setForm((prev) => ({ ...prev, unitTypeId: String(created.id) }));
                }
              } else {
                const id = String(form.unitTypeId);
                const res = await fetch(`${API_BASE_URL}/unit-types/${id}`, {
                  method: "PUT",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ name: trimmed }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  const message =
                    body?.errors?.name?.[0] ?? body?.message ?? "Failed to update unit type";
                  throw new Error(message);
                }
                setUnitTypeOptions((prev) =>
                  prev
                    .map((o) => (o.value === id ? { ...o, label: trimmed } : o))
                    .sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
                    ),
                );
              }
              setIsTypeModalOpen(false);
            } catch (err) {
              alert(err.message);
            }
          }}
          onDelete={async () => {
            try {
              const id = String(form.unitTypeId || "");
              if (!id) return;
              const confirmDelete = window.confirm("Delete this unit type? This cannot be undone.");
              if (!confirmDelete) return;
              const token = localStorage.getItem("auth_token");
              if (!token) {
                alert("Please log in to manage unit types.");
                return;
              }
              const res = await fetch(`${API_BASE_URL}/unit-types/${id}`, {
                method: "DELETE",
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });
              if (!res.ok && res.status !== 204) {
                const body = await res.json().catch(() => ({}));
                const message = body?.message ?? "Failed to delete unit type";
                throw new Error(message);
              }
              setUnitTypeOptions((prev) =>
                prev.filter((o) => String(o.value) !== id),
              );
              setForm((prev) => ({
                ...prev,
                unitTypeId: prev.unitTypeId === id ? "" : prev.unitTypeId,
              }));
              setIsTypeModalOpen(false);
            } catch (err) {
              alert(err.message);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label {...props} className="text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

function UnitTypeModal({ mode = "create", name, onNameChange, onClose, onSave, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "Add unit type" : "Edit unit type"}
        </h3>
        <div className="mt-4 space-y-2">
          <Label htmlFor="typeName">Name</Label>
          <Input
            id="typeName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Studio, 1BR, 2BR"
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Delete
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-xs font-medium text-red-500">
      {children}
    </p>
  );
}



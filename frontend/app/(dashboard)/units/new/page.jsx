"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function NewUnitPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialFormState);
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
  const [typeModalMode, setTypeModalMode] = useState("create"); // 'create' | 'edit'
  const [typeModalName, setTypeModalName] = useState("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");
  const [bulkPad, setBulkPad] = useState("0");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProperties() {
      setPropertyOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setPropertyOptionsError("Log in to load the property list.");
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
          setPropertyOptionsError(message);
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

        setPropertyOptions(options);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setPropertyOptionsError(
          "Could not load properties. Check your API connection.",
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
          setUnitTypeOptionsError("Log in to load unit types.");
          return;
        }

        const url = new URL(`${API_BASE_URL}/unit-types`);
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
            `Unable to load unit types (HTTP ${response.status}).`;
          setUnitTypeOptionsError(message);
          return;
        }

        const payload = await response.json();
        // Handle both wrapped and unwrapped responses
        const data = Array.isArray(payload?.data) 
          ? payload.data 
          : Array.isArray(payload) 
          ? payload 
          : [];

        const options = data
          .filter((type) => type?.id)
          .map((type) => ({
            value: String(type.id),
            label: type.name ?? `Type #${type.id ?? "?"}`,
            isActive: type.is_active !== false,
          }))
          .filter((option) => option.isActive)
          .map(({ value, label }) => ({ value, label }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );

        setUnitTypeOptions(options);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setUnitTypeOptionsError(
          "Could not load unit types. Check your API connection.",
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
        throw new Error("Please log in before creating a unit.");
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

      const response = await fetch(`${API_BASE_URL}/units`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        setValidationErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation error.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Could not create unit (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json().catch(() => null);
      const unit = result?.data ?? result ?? {};
      const createdUnitId = unit?.id;

      setSuccess(true);
      setForm(initialFormState);

      setTimeout(() => {
        if (createdUnitId) {
          router.push(`/units/${createdUnitId}`);
        } else {
          router.push("/units");
        }
        router.refresh();
      }, 1200);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedDepositMultiplier) {
      setForm((prev) => {
        if (prev.securityDeposit === "") {
          return prev;
        }

        return {
          ...prev,
          securityDeposit: "",
        };
      });

      return;
    }

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/units"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Back to units</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers size={24} className="text-primary" />
            Add a unit
          </h1>
          <p className="text-sm text-slate-600">
            Create a new unit and assign it to a property in your portfolio.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>Unit created successfully. Redirecting…</p>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          suppressHydrationWarning
        >
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
              suppressHydrationWarning
            >
              <option value="">Select a property…</option>
              {sortedPropertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.property_id ? (
              <FieldError id="property-error">
                {validationErrors.property_id[0]}
              </FieldError>
            ) : null}
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
              suppressHydrationWarning
            >
              <option value="">Select a unit type…</option>
              {sortedUnitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.unit_type_id ? (
              <FieldError id="unit-type-error">
                {validationErrors.unit_type_id[0]}
              </FieldError>
            ) : null}
            {unitTypeOptionsError ? (
              <p className="text-xs text-amber-600">{unitTypeOptionsError}</p>
            ) : null}
          </Fieldset>

          <Fieldset>
            <div className="flex items-center justify-between">
              <Label htmlFor="unitNumber">Unit number</Label>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:text-primary/80"
                onClick={() => {
                  const missing = [];
                  if (!form.propertyId) missing.push("Property");
                  if (!form.unitTypeId) missing.push("Unit type");
                  if (String(form.rentAmount).trim() === "") missing.push("Monthly rent");

                  if (missing.length > 0) {
                    setMissingFields(missing);
                    setIsMissingModalOpen(true);
                    return;
                  }

                  setIsBulkModalOpen(true);
                }}
                title="Create multiple units by sequence"
              >
                Bulk Unit Creation
              </button>
            </div>
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
              suppressHydrationWarning
            />
            {validationErrors.unit_number ? (
              <FieldError id="unit-number-error">
                {validationErrors.unit_number[0]}
              </FieldError>
            ) : null}
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
              suppressHydrationWarning
            />
            {validationErrors.rent_amount ? (
              <FieldError id="rent-amount-error">
                {validationErrors.rent_amount[0]}
              </FieldError>
            ) : null}
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
              suppressHydrationWarning
            />
            {validationErrors.security_deposit ? (
              <FieldError id="security-deposit-error">
                {validationErrors.security_deposit[0]}
              </FieldError>
            ) : null}
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
                suppressHydrationWarning
              />
              Mark as occupied
            </label>
            {validationErrors.is_occupied ? (
              <FieldError id="occupied-error">
                {validationErrors.is_occupied[0]}
              </FieldError>
            ) : null}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/units"
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
                  Create unit
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {isMissingModalOpen ? (
        <InfoModal
          title="Complete required fields"
          onClose={() => setIsMissingModalOpen(false)}
        >
          <p className="text-sm text-slate-700">
            Please fill the following before using Bulk Unit Creation:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-800">
            {missingFields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsMissingModalOpen(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Got it
            </button>
          </div>
        </InfoModal>
      ) : null}

      {isBulkModalOpen ? (
        <BulkUnitsModal
          prefix={bulkPrefix}
          start={bulkStart}
          end={bulkEnd}
          pad={bulkPad}
          onChange={({ prefix, start, end, pad }) => {
            if (prefix !== undefined) setBulkPrefix(prefix);
            if (start !== undefined) setBulkStart(start);
            if (end !== undefined) setBulkEnd(end);
            if (pad !== undefined) setBulkPad(pad);
          }}
          submitting={bulkSubmitting}
          results={bulkResults}
          errors={bulkErrors}
          onClose={() => {
            if (bulkSubmitting) return;
            setIsBulkModalOpen(false);
            setBulkErrors([]);
            setBulkResults([]);
          }}
          onCreate={async () => {
            setBulkErrors([]);
            setBulkResults([]);

            const startNum = Number(bulkStart);
            const endNum = Number(bulkEnd);
            const padNum = Math.max(0, Number(bulkPad) || 0);

            if (!form.propertyId) {
              alert("Please select a Property before bulk creating units.");
              return;
            }
            if (!form.unitTypeId) {
              alert("Please select a Unit type before bulk creating units.");
              return;
            }
            if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
              alert("Start and End must be valid numbers.");
              return;
            }
            if (endNum < startNum) {
              alert("End must be greater than or equal to Start.");
              return;
            }

            const token = localStorage.getItem("auth_token");
            if (!token) {
              alert("Please log in before creating units.");
              return;
            }

            // Prepare common payload fields
            const common = {
              property_id: Number(form.propertyId),
              unit_type_id: Number(form.unitTypeId),
              rent_amount: form.rentAmount !== "" ? Number(form.rentAmount) : undefined,
              security_deposit:
                form.securityDeposit !== "" ? Number(form.securityDeposit) : null,
              is_occupied: Boolean(form.isOccupied),
            };

            const toCreate = [];
            for (let n = startNum; n <= endNum; n++) {
              const numStr =
                padNum > 0 ? String(n).padStart(padNum, "0") : String(n);
              const unit_number = `${bulkPrefix ?? ""}${numStr}`;
              toCreate.push(unit_number);
            }

            setBulkSubmitting(true);
            try {
              const created = [];
              const failed = [];

              for (const unit_number of toCreate) {
                const payload = { ...common, unit_number };
                // Remove undefined keys
                Object.keys(payload).forEach((k) => {
                  if (payload[k] === undefined) delete payload[k];
                });

                // eslint-disable-next-line no-await-in-loop
                const res = await fetch(`${API_BASE_URL}/units`, {
                  method: "POST",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(payload),
                });

                if (res.status === 422) {
                  const body = await res.json().catch(() => ({}));
                  failed.push({
                    unit_number,
                    error:
                      body?.errors?.unit_number?.[0] ||
                      body?.message ||
                      "Validation error",
                  });
                  continue;
                }

                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  failed.push({
                    unit_number,
                    error:
                      body?.message ||
                      `Failed (HTTP ${res.status})`,
                  });
                  continue;
                }

                const body = await res.json().catch(() => null);
                const data = body?.data ?? body ?? {};
                created.push({ unit_number, id: data?.id });
              }

              setBulkResults(created);
              setBulkErrors(failed);

              if (created.length > 0 && failed.length === 0) {
                // All good → close and go to units list
                setIsBulkModalOpen(false);
                router.push("/units");
                router.refresh();
              }
            } catch (err) {
              alert(err.message);
            } finally {
              setBulkSubmitting(false);
            }
          }}
        />
      ) : null}

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
                
                let body;
                try {
                  body = await res.json();
                } catch (parseError) {
                  console.error("Failed to parse response:", parseError);
                  throw new Error("Invalid response from server. Please try again.");
                }
                
                if (!res.ok) {
                  const message =
                    body?.errors?.name?.[0] ?? 
                    body?.message ?? 
                    `Failed to create unit type (HTTP ${res.status})`;
                  console.error("API error:", { status: res.status, body });
                  throw new Error(message);
                }
                
                // Handle both wrapped and unwrapped responses
                const created = body?.data ?? body;
                
                if (!created) {
                  console.error("Unexpected response format:", body);
                  throw new Error("Invalid response format from server.");
                }
                
                if (!created.id || !created.name) {
                  console.error("Missing required fields in response:", created);
                  throw new Error("Server response missing required fields (id or name).");
                }
                
                const option = { value: String(created.id), label: created.name };
                setUnitTypeOptions((prev) => {
                  const next = [...prev];
                  if (!next.some((o) => o.value === option.value)) next.push(option);
                  return next.sort((a, b) =>
                    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
                  );
                });
                setForm((prev) => ({ ...prev, unitTypeId: String(created.id) }));
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
                
                let body;
                try {
                  body = await res.json();
                } catch (parseError) {
                  console.error("Failed to parse response:", parseError);
                  throw new Error("Invalid response from server. Please try again.");
                }
                
                if (!res.ok) {
                  const message =
                    body?.errors?.name?.[0] ?? 
                    body?.message ?? 
                    `Failed to update unit type (HTTP ${res.status})`;
                  console.error("API error:", { status: res.status, body });
                  throw new Error(message);
                }
                
                // Handle both wrapped and unwrapped responses
                const updated = body?.data ?? body;
                
                if (!updated || !updated.name) {
                  console.error("Unexpected response format:", body);
                  throw new Error("Invalid response format from server.");
                }
                
                setUnitTypeOptions((prev) =>
                  prev
                    .map((o) => (o.value === id ? { ...o, label: updated.name } : o))
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

function InfoModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function BulkUnitsModal({
  prefix,
  start,
  end,
  pad,
  onChange,
  submitting,
  results,
  errors,
  onClose,
  onCreate,
}) {
  const startNum = Number(start);
  const endNum = Number(end);
  const padNum = Math.max(0, Number(pad) || 0);
  const total =
    Number.isFinite(startNum) && Number.isFinite(endNum) && endNum >= startNum
      ? endNum - startNum + 1
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Bulk Unit Creation</h3>
        <p className="mt-1 text-sm text-slate-600">
          Generate a sequence of unit numbers. Other fields will be copied from the current form.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="bulkPrefix">Prefix (optional)</Label>
            <Input
              id="bulkPrefix"
              value={prefix}
              onChange={(e) => onChange({ prefix: e.target.value })}
              placeholder="e.g. A-"
              disabled={submitting}
            />
          </div>
          <div>
            <Label htmlFor="bulkStart">Start number</Label>
            <Input
              id="bulkStart"
              type="number"
              min="0"
              step="1"
              value={start}
              onChange={(e) => onChange({ start: e.target.value })}
              placeholder="101"
              disabled={submitting}
            />
          </div>
          <div>
            <Label htmlFor="bulkEnd">End number</Label>
            <Input
              id="bulkEnd"
              type="number"
              min="0"
              step="1"
              value={end}
              onChange={(e) => onChange({ end: e.target.value })}
              placeholder="120"
              disabled={submitting}
            />
          </div>
          <div>
            <Label htmlFor="bulkPad">Zero padding (optional)</Label>
            <Input
              id="bulkPad"
              type="number"
              min="0"
              step="1"
              value={pad}
              onChange={(e) => onChange({ pad: e.target.value })}
              placeholder="0 for none, e.g. 3 -> 001"
              disabled={submitting}
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-600">
          {total > 0 ? `Will create ${total} unit${total > 1 ? "s" : ""}.` : "Enter a valid range."}
        </div>
        {(errors?.length || 0) > 0 ? (
          <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            {errors.map((e, idx) => (
              <div key={`${e.unit_number}-${idx}`} className="py-0.5">
                <span className="font-semibold">{e.unit_number}</span>: {e.error}
              </div>
            ))}
          </div>
        ) : null}
        {(results?.length || 0) > 0 ? (
          <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
            {results.map((r, idx) => (
              <div key={`${r.unit_number}-${idx}`} className="py-0.5">
                Created {r.unit_number}
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            disabled={submitting}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={submitting || total <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>Create units</>
            )}
          </button>
        </div>
      </div>
    </div>
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


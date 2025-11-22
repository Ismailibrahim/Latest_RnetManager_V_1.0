"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Users,
  CalendarRange,
  Building2,
  Wallet,
  FileText,
} from "lucide-react";
import { formatMVR } from "@/lib/currency";
import { API_BASE_URL } from "@/utils/api-config";
import { formatCurrencyNoDecimals } from "@/lib/currency-formatter";

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Ended", value: "ended" },
  { label: "Cancelled", value: "cancelled" },
];

const initialFormState = {
  tenantId: "",
  unitId: "",
  leaseStart: "",
  leaseEnd: "",
  leaseDurationYears: "",
  monthlyRent: "",
  securityDepositPaid: "",
  noticePeriodDays: "",
  lockInPeriodMonths: "",
  leaseDocumentPath: "",
  leaseDocumentFile: null,
  status: "active",
};

function NewTenantUnitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(() => ({ ...initialFormState }));
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [leaseEndAuto, setLeaseEndAuto] = useState(false);
  const [unitDefaults, setUnitDefaults] = useState({
    rent: null,
    deposit: null,
  });
  const [rentManuallyEdited, setRentManuallyEdited] = useState(false);
  const [securityDepositManuallyEdited, setSecurityDepositManuallyEdited] =
    useState(false);

  const leaseDocumentInputRef = useRef(null);

  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  useEffect(() => {
    const tenantParam =
      searchParams.get("tenantId") ??
      searchParams.get("tenant_id") ??
      searchParams.get("tenant");
    const unitParam =
      searchParams.get("unitId") ??
      searchParams.get("unit_id") ??
      searchParams.get("unit");

    if (!tenantParam && !unitParam) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      tenantId: tenantParam ? String(tenantParam) : previous.tenantId,
      unitId: unitParam ? String(unitParam) : previous.unitId,
    }));
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load tenants and units.");
        }

        const [tenantResponse, unitResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/tenants?per_page=100`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/units?per_page=100`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!tenantResponse.ok) {
          const payload = await tenantResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load tenants (HTTP ${tenantResponse.status}).`;
          throw new Error(message);
        }

        if (!unitResponse.ok) {
          const payload = await unitResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load units (HTTP ${unitResponse.status}).`;
          throw new Error(message);
        }

        const tenantPayload = await tenantResponse.json();
        const unitPayload = await unitResponse.json();

        if (!isMounted) {
          return;
        }

        const tenantItems = Array.isArray(tenantPayload?.data)
          ? tenantPayload.data
          : [];
        const unitItems = Array.isArray(unitPayload?.data)
          ? unitPayload.data
          : [];

        setTenants(
          [...tenantItems].sort((a, b) =>
            (a?.full_name ?? `Tenant #${a?.id ?? "-"}`).localeCompare(
              b?.full_name ?? `Tenant #${b?.id ?? "-"}`,
            ),
          ),
        );
        setUnits(
          [...unitItems].sort((a, b) => {
            const labelA = buildUnitLabel(a);
            const labelB = buildUnitLabel(b);
            return labelA.localeCompare(labelB);
          }),
        );
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setOptionsError(error.message);
          setTenants([]);
          setUnits([]);
        }
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const tenantOptions = useMemo(() => {
    return tenants.map((tenant) => ({
      value: String(tenant.id),
      label: tenant.full_name ?? tenant.email ?? `Tenant #${tenant.id}`,
    }));
  }, [tenants]);

  const unitOptions = useMemo(() => {
    return units.map((unit) => ({
      value: String(unit.id),
      label: buildUnitLabel(unit),
    }));
  }, [units]);

  const unitMap = useMemo(() => {
    return units.reduce((accumulator, unit) => {
      if (unit?.id) {
        accumulator.set(String(unit.id), unit);
      }

      return accumulator;
    }, new Map());
  }, [units]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "unitId") {
      setRentManuallyEdited(false);
      setSecurityDepositManuallyEdited(false);
    }

    if (name === "monthlyRent") {
      setRentManuallyEdited(true);
    }

    if (name === "securityDepositPaid") {
      setSecurityDepositManuallyEdited(true);
    }

    if (name === "leaseEnd") {
      setLeaseEndAuto(false);
      setForm((previous) => ({
        ...previous,
        leaseEnd: value,
        leaseDurationYears: "",
      }));
    } else if (name === "leaseDurationYears") {
      const trimmed = value.trim();
      setLeaseEndAuto(trimmed.length > 0);
      setForm((previous) => ({
        ...previous,
        leaseDurationYears: value,
      }));
    } else {
      setForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    }

    setValidationErrors((previous) => {
      if (!previous || Object.keys(previous).length === 0) {
        return previous;
      }

      const next = { ...previous };
      delete next[nameToApiKey(name)];

      if (name === "leaseEnd") {
        delete next[nameToApiKey("leaseDurationYears")];
      }
      if (name === "leaseDurationYears") {
        delete next.lease_end;
      }

      return next;
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    setForm((previous) => ({
      ...previous,
      leaseDocumentFile: file,
    }));

    setValidationErrors((previous) => {
      if (!previous || Object.keys(previous).length === 0) {
        return previous;
      }

      const next = { ...previous };
      delete next.lease_document;
      return next;
    });
  };

  const handleFileRemove = () => {
    setForm((previous) => {
      if (!previous.leaseDocumentFile) {
        return previous;
      }

      return {
        ...previous,
        leaseDocumentFile: null,
      };
    });

    if (leaseDocumentInputRef.current) {
      leaseDocumentInputRef.current.value = "";
    }

    setValidationErrors((previous) => {
      if (!previous || Object.keys(previous).length === 0) {
        return previous;
      }

      const next = { ...previous };
      delete next.lease_document;
      return next;
    });
  };

  useEffect(() => {
    if (!form.unitId) {
      setUnitDefaults({
        rent: null,
        deposit: null,
      });
      return;
    }

    const unit = unitMap.get(String(form.unitId));

    if (!unit) {
      setUnitDefaults({
        rent: null,
        deposit: null,
      });
      return;
    }

    const rentValue = toNumericValue(
      unit.rent_amount ??
        unit.rentAmount ??
        unit.monthly_rent ??
        unit.monthlyRent ??
        unit.rent,
    );
    const depositValue = toNumericValue(
      unit.security_deposit ??
        unit.securityDeposit ??
        unit.security_deposit_paid ??
        unit.securityDepositPaid ??
        unit.deposit,
    );

    setUnitDefaults({
      rent: rentValue,
      deposit: depositValue,
    });

    setForm((previous) => {
      let updated = previous;
      let changed = false;

      if (!rentManuallyEdited && rentValue !== null) {
        const rentString = rentValue.toString();
        if (previous.monthlyRent !== rentString) {
          if (!changed) {
            updated = { ...previous };
            changed = true;
          }
          updated.monthlyRent = rentString;
        }
      }

      if (!securityDepositManuallyEdited && depositValue !== null) {
        const depositString = depositValue.toString();
        const currentDeposit =
          changed && updated !== previous
            ? updated.securityDepositPaid
            : previous.securityDepositPaid;

        if (currentDeposit !== depositString) {
          if (!changed) {
            updated = { ...previous };
            changed = true;
          }
          updated.securityDepositPaid = depositString;
        }
      }

      if (!changed) {
        return previous;
      }

      return updated;
    });
  }, [
    form.unitId,
    unitMap,
    rentManuallyEdited,
    securityDepositManuallyEdited,
  ]);

  useEffect(() => {
    if (!leaseEndAuto) {
      return;
    }

    const yearsValue = parseFloat(form.leaseDurationYears);
    if (!Number.isFinite(yearsValue) || yearsValue <= 0) {
      return;
    }

    if (!form.leaseStart) {
      return;
    }

    const nextLeaseEnd = calculateLeaseEndDate(form.leaseStart, yearsValue);

    if (!nextLeaseEnd) {
      return;
    }

    setForm((previous) => {
      if (previous.leaseEnd === nextLeaseEnd) {
        return previous;
      }

      return {
        ...previous,
        leaseEnd: nextLeaseEnd,
      };
    });

    setValidationErrors((previous) => {
      if (!previous || !previous.lease_end) {
        return previous;
      }

      const next = { ...previous };
      delete next.lease_end;
      return next;
    });
  }, [leaseEndAuto, form.leaseStart, form.leaseDurationYears]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before assigning a tenant.");
      }

      const payload = buildFormData(form);

      const response = await fetch(`${API_BASE_URL}/tenant-units`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        setValidationErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to create tenant-unit assignment (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setSuccess(true);
      setForm(() => ({ ...initialFormState }));
      if (leaseDocumentInputRef.current) {
        leaseDocumentInputRef.current.value = "";
      }
      setLeaseEndAuto(false);
      setRentManuallyEdited(false);
      setSecurityDepositManuallyEdited(false);
      setUnitDefaults({
        rent: null,
        deposit: null,
      });

      const preferredDestination = form.tenantId
        ? `/tenant-units?tenantId=${form.tenantId}`
        : "/tenant-units";

      setTimeout(() => {
        router.push(preferredDestination);
        router.refresh();
      }, 1200);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit = submitting || optionsLoading;

  const formattedDefaultRent =
    unitDefaults.rent !== null ? formatMVR(unitDefaults.rent) : null;
  const formattedDefaultDeposit =
    unitDefaults.deposit !== null ? formatMVR(unitDefaults.deposit) : null;

  const monthlyRentLabel = formattedDefaultRent
    ? `Monthly rent for this lease (default from unit: ${formattedDefaultRent})`
    : "Monthly rent for this lease (MVR)";
  const securityDepositLabel = formattedDefaultDeposit
    ? `Security deposit for this lease (default from unit: ${formattedDefaultDeposit})`
    : "Security deposit for this lease (MVR)";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/tenant-units"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users size={24} className="text-primary" />
            Assign Tenant to Unit
          </h1>
          <p className="text-sm text-slate-600">
            Create a lease record to link an existing tenant with a unit.
            Occupancy updates automatically once the lease is active.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {optionsError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">We couldn&apos;t load all options.</p>
              <p className="mt-1 text-xs text-amber-700">
                {optionsError} Selects below may be incomplete.
              </p>
            </div>
          </div>
        ) : null}

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>
              Assignment created successfully. Redirecting you back to tenant-unit
              records…
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Fieldset>
              <Label htmlFor="tenantId">Tenant</Label>
              <select
                id="tenantId"
                name="tenantId"
                value={form.tenantId}
                onChange={handleChange}
                disabled={disableSubmit || tenantOptions.length === 0}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-describedby={
                  validationErrors.tenant_id ? "tenantId-error" : undefined
                }
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
              <Hint icon={<Users size={14} className="text-slate-400" />}>
                Tenants are created from the tenant list.
              </Hint>
              {validationErrors.tenant_id ? (
                <FieldError id="tenantId-error">
                  {firstError(validationErrors.tenant_id)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="unitId">Unit</Label>
              <select
                id="unitId"
                name="unitId"
                value={form.unitId}
                onChange={handleChange}
                disabled={disableSubmit || unitOptions.length === 0}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-describedby={
                  validationErrors.unit_id ? "unitId-error" : undefined
                }
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
              <Hint icon={<Building2 size={14} className="text-slate-400" />}>
                Units must already exist in your portfolio.
              </Hint>
              {validationErrors.unit_id ? (
                <FieldError id="unitId-error">
                  {firstError(validationErrors.unit_id)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Fieldset>
              <Label htmlFor="leaseStart">Lease start</Label>
              <Input
                id="leaseStart"
                name="leaseStart"
                type="date"
                value={form.leaseStart}
                onChange={handleChange}
                disabled={disableSubmit}
                required
                aria-describedby={
                  validationErrors.lease_start ? "leaseStart-error" : undefined
                }
              />
              {validationErrors.lease_start ? (
                <FieldError id="leaseStart-error">
                  {firstError(validationErrors.lease_start)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="leaseDurationYears">Lease length (years)</Label>
              <Input
                id="leaseDurationYears"
                name="leaseDurationYears"
                type="number"
                min="0"
                step="0.1"
                placeholder="1"
                value={form.leaseDurationYears}
                onChange={handleChange}
                disabled={disableSubmit}
              />
              <Hint
                icon={<CalendarRange size={14} className="text-slate-400" />}
              >
                Enter a duration to auto-fill the lease end date.
              </Hint>
            </Fieldset>

            <Fieldset>
              <Label htmlFor="leaseEnd">Lease end</Label>
              <Input
                id="leaseEnd"
                name="leaseEnd"
                type="date"
                value={form.leaseEnd}
                onChange={handleChange}
                disabled={disableSubmit}
                required
                aria-describedby={
                  validationErrors.lease_end ? "leaseEnd-error" : undefined
                }
              />
              <Hint icon={<CalendarRange size={14} className="text-slate-400" />}>
                Must be after the start date.
              </Hint>
              {validationErrors.lease_end ? (
                <FieldError id="leaseEnd-error">
                  {firstError(validationErrors.lease_end)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Fieldset>
              <Label htmlFor="monthlyRent">{monthlyRentLabel}</Label>
              <Input
                id="monthlyRent"
                name="monthlyRent"
                type="number"
                min="0"
                step="0.01"
                placeholder="25000"
                value={form.monthlyRent}
                onChange={handleChange}
                disabled={disableSubmit}
                required
                aria-describedby={
                  validationErrors.monthly_rent ? "monthlyRent-error" : undefined
                }
              />
              <Hint icon={<Wallet size={14} className="text-slate-400" />}>
                Enter the agreed monthly rental amount.
              </Hint>
              {validationErrors.monthly_rent ? (
                <FieldError id="monthlyRent-error">
                  {firstError(validationErrors.monthly_rent)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="securityDepositPaid">
                {securityDepositLabel}
              </Label>
              <Input
                id="securityDepositPaid"
                name="securityDepositPaid"
                type="number"
                min="0"
                step="0.01"
                placeholder="25000"
                value={form.securityDepositPaid}
                onChange={handleChange}
                disabled={disableSubmit}
                required
                aria-describedby={
                  validationErrors.security_deposit_paid
                    ? "securityDeposit-error"
                    : undefined
                }
              />
              <Hint icon={<FileText size={14} className="text-slate-400" />}>
                Record the deposit collected at lease signing.
              </Hint>
              {validationErrors.security_deposit_paid ? (
                <FieldError id="securityDeposit-error">
                  {firstError(validationErrors.security_deposit_paid)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Fieldset>
              <Label htmlFor="noticePeriodDays">Notice period (days)</Label>
              <Input
                id="noticePeriodDays"
                name="noticePeriodDays"
                type="number"
                min="0"
                step="1"
                placeholder="30"
                value={form.noticePeriodDays}
                onChange={handleChange}
                disabled={disableSubmit}
                aria-describedby={
                  validationErrors.notice_period_days
                    ? "noticePeriod-error"
                    : undefined
                }
              />
              {validationErrors.notice_period_days ? (
                <FieldError id="noticePeriod-error">
                  {firstError(validationErrors.notice_period_days)}
                </FieldError>
              ) : null}
            </Fieldset>

            <Fieldset>
              <Label htmlFor="lockInPeriodMonths">Lock-in period (months)</Label>
              <Input
                id="lockInPeriodMonths"
                name="lockInPeriodMonths"
                type="number"
                min="0"
                step="1"
                placeholder="6"
                value={form.lockInPeriodMonths}
                onChange={handleChange}
                disabled={disableSubmit}
                aria-describedby={
                  validationErrors.lock_in_period_months
                    ? "lockInPeriod-error"
                    : undefined
                }
              />
              {validationErrors.lock_in_period_months ? (
                <FieldError id="lockInPeriod-error">
                  {firstError(validationErrors.lock_in_period_months)}
                </FieldError>
              ) : null}
            </Fieldset>
          </div>

          <Fieldset>
            <Label htmlFor="leaseDocumentFile">Lease agreement (PDF upload)</Label>
            <input
              id="leaseDocumentFile"
              name="leaseDocumentFile"
              type="file"
              accept=".pdf,application/pdf"
              disabled={disableSubmit}
              onChange={handleFileChange}
              ref={leaseDocumentInputRef}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.lease_document
                  ? "leaseDocumentFile-error"
                  : undefined
              }
            />
            <Hint icon={<FileText size={14} className="text-slate-400" />}>
              Optional. Upload a lease agreement PDF (max 20 MB).
            </Hint>
            {form.leaseDocumentFile ? (
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">
                  {form.leaseDocumentFile.name}
                </span>
                <span className="text-slate-400">
                  {formatFileSize(form.leaseDocumentFile.size)}
                </span>
                <button
                  type="button"
                  onClick={handleFileRemove}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Remove file
                </button>
              </p>
            ) : null}
            {validationErrors.lease_document ? (
              <FieldError id="leaseDocumentFile-error">
                {firstError(validationErrors.lease_document)}
              </FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="leaseDocumentPath">Lease document link</Label>
            <Input
              id="leaseDocumentPath"
              name="leaseDocumentPath"
              placeholder="https://example.com/lease.pdf"
              value={form.leaseDocumentPath}
              onChange={handleChange}
              disabled={disableSubmit}
              aria-describedby={
                validationErrors.lease_document_path
                  ? "leaseDocument-error"
                  : undefined
              }
            />
            <Hint icon={<FileText size={14} className="text-slate-400" />}>
              Optional. Paste a document URL or storage path to reference an
              existing lease.
            </Hint>
            {validationErrors.lease_document_path ? (
              <FieldError id="leaseDocument-error">
                {firstError(validationErrors.lease_document_path)}
              </FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="status">Lease status</Label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={disableSubmit}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.status ? "status-error" : undefined
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.status ? (
              <FieldError id="status-error">
                {firstError(validationErrors.status)}
              </FieldError>
            ) : null}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/tenant-units"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={disableSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Users size={16} />
                  Create assignment
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function calculateLeaseEndDate(leaseStart, years) {
  if (!leaseStart) {
    return null;
  }

  if (!Number.isFinite(years) || years <= 0) {
    return null;
  }

  const monthsToAdd = Math.round(years * 12);

  if (!Number.isFinite(monthsToAdd) || monthsToAdd <= 0) {
    return null;
  }

  return addMonthsToDateString(leaseStart, monthsToAdd);
}

function addMonthsToDateString(dateString, monthsToAdd) {
  if (!dateString || !Number.isFinite(monthsToAdd)) {
    return null;
  }

  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, monthIndex, day));

  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  date.setUTCMonth(date.getUTCMonth() + monthsToAdd);

  const finalYear = date.getUTCFullYear();
  const finalMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const finalDay = String(date.getUTCDate()).padStart(2, "0");

  return `${finalYear}-${finalMonth}-${finalDay}`;
}

function toNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildFormData(form) {
  const formData = new FormData();

  appendRequiredField(formData, "tenant_id", form.tenantId);
  appendRequiredField(formData, "unit_id", form.unitId);
  appendRequiredField(formData, "lease_start", form.leaseStart);
  appendRequiredField(formData, "lease_end", form.leaseEnd);
  appendRequiredNumeric(formData, "monthly_rent", form.monthlyRent);
  appendRequiredNumeric(
    formData,
    "security_deposit_paid",
    form.securityDepositPaid,
  );
  appendOptionalNumeric(formData, "notice_period_days", form.noticePeriodDays);
  appendOptionalNumeric(
    formData,
    "lock_in_period_months",
    form.lockInPeriodMonths,
  );

  const leasePath = normalizeString(form.leaseDocumentPath);
  if (leasePath !== null) {
    formData.append("lease_document_path", leasePath);
  }

  if (form.leaseDocumentFile instanceof File) {
    formData.append("lease_document", form.leaseDocumentFile);
  }

  appendRequiredField(formData, "status", form.status);

  return formData;
}

function appendRequiredField(formData, key, value) {
  const normalized = normalizeString(value);

  if (normalized !== null) {
    formData.append(key, normalized);
    return;
  }

  formData.append(key, "");
}

function appendRequiredNumeric(formData, key, value) {
  const number = Number(value);

  if (Number.isFinite(number)) {
    formData.append(key, String(number));
    return;
  }

  formData.append(key, "");
}

function appendOptionalNumeric(formData, key, value) {
  const numeric = normalizeNumber(value);

  if (numeric === null) {
    return;
  }

  formData.append(key, String(numeric));
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** exponent;

  if (exponent === 0) {
    return `${bytes} ${units[exponent]}`;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
}

function buildUnitLabel(unit) {
  if (!unit) {
    return "Unit";
  }

  const unitNumber =
    unit.unit_number ?? (unit.id ? `Unit #${unit.id}` : "Unit");
  const propertyName = unit?.property?.name ?? unit?.property_name;

  return propertyName ? `${unitNumber} • ${propertyName}` : unitNumber;
}

function formatCurrency(value) {
  return formatCurrencyNoDecimals(value);
}

function nameToApiKey(name) {
  const map = {
    tenantId: "tenant_id",
    unitId: "unit_id",
    leaseStart: "lease_start",
    leaseEnd: "lease_end",
    leaseDurationYears: "lease_duration_years",
    monthlyRent: "monthly_rent",
    securityDepositPaid: "security_deposit_paid",
    noticePeriodDays: "notice_period_days",
    lockInPeriodMonths: "lock_in_period_months",
    leaseDocumentPath: "lease_document_path",
    leaseDocumentFile: "lease_document",
    status: "status",
  };

  return map[name] ?? name;
}

function firstError(error) {
  if (!error) {
    return null;
  }

  if (Array.isArray(error) && error.length > 0) {
    return error[0];
  }

  if (typeof error === "string") {
    return error;
  }

  return "Invalid value.";
}

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label
      {...props}
      className="text-sm font-semibold text-slate-700"
    >
      {children}
    </label>
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

function Hint({ children, icon }) {
  if (!children) {
    return null;
  }

  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
      {icon}
      <span>{children}</span>
    </p>
  );
}

export default function NewTenantUnitPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading tenant unit form…</div>}>
      <NewTenantUnitPageContent />
    </Suspense>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Users,
  Plus,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Former", value: "former" },
];

const idProofOptions = [
  { label: "National ID", value: "national_id" },
  { label: "Passport", value: "passport" },
];

const initialFormState = {
  fullName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  nationalityId: "",
  idProofType: "",
  idProofNumber: "",
  status: "active",
};

const fieldKeyMap = {
  fullName: "full_name",
  email: "email",
  phone: "phone",
  alternatePhone: "alternate_phone",
  emergencyContactName: "emergency_contact_name",
  emergencyContactPhone: "emergency_contact_phone",
  emergencyContactRelationship: "emergency_contact_relationship",
  nationalityId: "nationality_id",
  idProofType: "id_proof_type",
  idProofNumber: "id_proof_number",
  status: "status",
};

export default function NewTenantPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [nationalities, setNationalities] = useState([]);
  const [nationalitiesLoading, setNationalitiesLoading] = useState(true);
  const [nationalitiesError, setNationalitiesError] = useState(null);
  const [isAddingNationality, setIsAddingNationality] = useState(false);
  const [newNationalityName, setNewNationalityName] = useState("");
  const [addingNationality, setAddingNationality] = useState(false);
  const [addNationalityError, setAddNationalityError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadNationalities() {
      setNationalitiesLoading(true);
      setNationalitiesError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          if (isMounted) {
            setNationalities([]);
          }
          return;
        }

        const response = await fetch(`${API_BASE_URL}/nationalities?paginate=false`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ?? `Unable to load nationalities (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];

        if (!isMounted) {
          return;
        }

        setNationalities(
          [...items].sort((a, b) =>
            (a?.name ?? "").localeCompare(b?.name ?? "", undefined, {
              sensitivity: "base",
            }),
          ),
        );
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setNationalitiesError(error.message);
          setNationalities([]);
        }
      } finally {
        if (isMounted) {
          setNationalitiesLoading(false);
        }
      }
    }

    loadNationalities();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleAddNationalityClick = () => {
    setIsAddingNationality((previous) => !previous);
    setNewNationalityName("");
    setAddNationalityError(null);
  };

  const handleCreateNationality = async () => {
    const trimmed = newNationalityName.trim();

    if (trimmed.length === 0) {
      setAddNationalityError("Please enter a nationality name.");
      return;
    }

    setAddingNationality(true);
    setAddNationalityError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before adding a nationality.");
      }

      const response = await fetch(`${API_BASE_URL}/nationalities`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ?? `Unable to add nationality (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const nationality = payload?.data ?? payload ?? null;

      if (!nationality?.id) {
        throw new Error("The nationality was added but the response was missing an ID.");
      }

      setNationalities((previous) =>
        [...previous, nationality].sort((a, b) =>
          (a?.name ?? "").localeCompare(b?.name ?? "", undefined, {
            sensitivity: "base",
          }),
        ),
      );
      setForm((previous) => ({
        ...previous,
        nationalityId: String(nationality.id),
      }));
      setIsAddingNationality(false);
      setNewNationalityName("");
    } catch (error) {
      setAddNationalityError(error.message);
    } finally {
      setAddingNationality(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
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

  const normalizeOptional = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});
    setSuccess(false);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before creating a tenant.");
      }

      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        status: form.status,
        email: normalizeOptional(form.email),
        alternate_phone: normalizeOptional(form.alternatePhone),
        emergency_contact_name: normalizeOptional(form.emergencyContactName),
        emergency_contact_phone: normalizeOptional(form.emergencyContactPhone),
        emergency_contact_relationship: normalizeOptional(
          form.emergencyContactRelationship,
        ),
        id_proof_type: normalizeOptional(form.idProofType),
        id_proof_number: form.idProofNumber.trim(),
      };

      if (!payload.full_name || !payload.phone || !payload.id_proof_number) {
        throw new Error(
          "Full name, phone number, and ID proof number are required. Please fill them in.",
        );
      }

      if (form.nationalityId) {
        payload.nationality_id = Number(form.nationalityId);
      }

      if (!payload.id_proof_type) {
        payload.id_proof_type = null;
      }

      const response = await fetch(`${API_BASE_URL}/tenants`, {
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
          `Could not create tenant (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json().catch(() => null);
      const tenant = result?.data ?? result ?? {};
      const createdTenantId = tenant?.id;

      setSuccess(true);
      setForm(initialFormState);

      setTimeout(() => {
        if (createdTenantId) {
          router.push(`/tenants/${createdTenantId}`);
        } else {
          router.push("/tenants");
        }
        router.refresh();
      }, 1200);
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
          href="/tenants"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Back to tenants</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users size={24} className="text-primary" />
            Add a tenant
          </h1>
          <p className="text-sm text-slate-600">
            Create a tenant profile with contact details and identification.
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
            <p>Tenant created successfully. Redirecting…</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Fieldset>
            <Label htmlFor="fullName">
              Full name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="Aishath Ibrahim"
              value={form.fullName}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-required="true"
              aria-describedby={
                validationErrors.full_name ? "full-name-error" : undefined
              }
            />
            {validationErrors.full_name && (
              <FieldError id="full-name-error">
                {validationErrors.full_name[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tenant@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.email ? "email-error" : undefined
              }
            />
            {validationErrors.email && (
              <FieldError id="email-error">
                {validationErrors.email[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="phone">
              Primary phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+960 7XXXXXX"
              value={form.phone}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-required="true"
              aria-describedby={
                validationErrors.phone ? "phone-error" : undefined
              }
            />
            {validationErrors.phone && (
              <FieldError id="phone-error">
                {validationErrors.phone[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="alternatePhone">Alternate phone</Label>
            <Input
              id="alternatePhone"
              name="alternatePhone"
              placeholder="+960 9XXXXXX"
              value={form.alternatePhone}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.alternate_phone
                  ? "alternate-phone-error"
                  : undefined
              }
            />
            {validationErrors.alternate_phone && (
              <FieldError id="alternate-phone-error">
                {validationErrors.alternate_phone[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="emergencyContactName">
              Emergency contact name
            </Label>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              placeholder="Hassan Mohamed"
              value={form.emergencyContactName}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.emergency_contact_name
                  ? "emergency-contact-name-error"
                  : undefined
              }
            />
            {validationErrors.emergency_contact_name && (
              <FieldError id="emergency-contact-name-error">
                {validationErrors.emergency_contact_name[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="emergencyContactPhone">
              Emergency contact phone
            </Label>
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              placeholder="+960 3XXXXXX"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.emergency_contact_phone
                  ? "emergency-contact-phone-error"
                  : undefined
              }
            />
            {validationErrors.emergency_contact_phone && (
              <FieldError id="emergency-contact-phone-error">
                {validationErrors.emergency_contact_phone[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="emergencyContactRelationship">
              Emergency contact relationship
            </Label>
            <Input
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              placeholder="Sibling"
              value={form.emergencyContactRelationship}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.emergency_contact_relationship
                  ? "emergency-contact-relationship-error"
                  : undefined
              }
            />
            {validationErrors.emergency_contact_relationship && (
              <FieldError id="emergency-contact-relationship-error">
                {validationErrors.emergency_contact_relationship[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="nationalityId">Nationality</Label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="nationalityId"
                name="nationalityId"
                value={form.nationalityId}
                onChange={handleChange}
                disabled={submitting || nationalitiesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
                aria-describedby={
                  validationErrors.nationality_id ? "nationality-id-error" : undefined
                }
              >
                <option value="">Select nationality…</option>
                {nationalities.map((nationality) => (
                  <option key={nationality.id} value={nationality.id}>
                    {nationality.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddNationalityClick}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                <Plus size={14} />
                {isAddingNationality ? "Close" : "Add new"}
              </button>
            </div>
            {nationalitiesLoading ? (
              <p className="mt-2 text-xs text-slate-500">Loading nationalities…</p>
            ) : null}
            {nationalitiesError ? (
              <FieldError id="nationalities-error">{nationalitiesError}</FieldError>
            ) : null}
            {validationErrors.nationality_id && (
              <FieldError id="nationality-id-error">
                {validationErrors.nationality_id[0]}
              </FieldError>
            )}
            {isAddingNationality ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  name="newNationalityName"
                  placeholder="Enter nationality"
                  value={newNationalityName}
                  onChange={(event) => {
                    setNewNationalityName(event.target.value);
                    setAddNationalityError(null);
                  }}
                  disabled={addingNationality}
                  className="sm:flex-1"
                />
                <button
                  type="button"
                  onClick={handleCreateNationality}
                  disabled={addingNationality}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {addingNationality ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            ) : null}
            {addNationalityError ? (
              <FieldError id="add-nationality-error">{addNationalityError}</FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="status">Tenant status</Label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={submitting}
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
            {validationErrors.status && (
              <FieldError id="status-error">
                {validationErrors.status[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="idProofType">ID proof type</Label>
            <select
              id="idProofType"
              name="idProofType"
              value={form.idProofType}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.id_proof_type ? "id-proof-type-error" : undefined
              }
            >
              <option value="">Select ID proof…</option>
              {idProofOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.id_proof_type && (
              <FieldError id="id-proof-type-error">
                {validationErrors.id_proof_type[0]}
              </FieldError>
            )}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="idProofNumber">
              ID proof number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="idProofNumber"
              name="idProofNumber"
              placeholder="Document reference"
              value={form.idProofNumber}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-required="true"
              aria-describedby={
                validationErrors.id_proof_number
                  ? "id-proof-number-error"
                  : undefined
              }
            />
            {validationErrors.id_proof_number && (
              <FieldError id="id-proof-number-error">
                {validationErrors.id_proof_number[0]}
              </FieldError>
            )}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/tenants"
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
                  <Users size={16} />
                  Save tenant
                </>
              )}
            </button>
          </div>
        </form>
      </section>
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


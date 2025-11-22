"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Search,
  AlertTriangle,
  RefreshCcw,
  BookmarkPlus,
  Trash2,
} from "lucide-react";
import { useUnifiedPayments } from "@/hooks/useUnifiedPayments";
import { useTenantUnits } from "@/hooks/useTenantUnits";
import { usePaymentTemplates } from "@/hooks/usePaymentTemplates";
import {
  usePaymentMethods,
  formatPaymentMethodLabel,
} from "@/hooks/usePaymentMethods";
import { usePendingCharges } from "@/hooks/usePendingCharges";
import { getCurrencyOptions, getDefaultCurrency } from "@/utils/currency-config";
import { API_BASE_URL } from "@/utils/api-config";
import { Banknote } from "lucide-react";

const PAYMENT_TYPES = [
  {
    value: "rent",
    label: "Rent",
    description: "Collect monthly rent or one-off rent adjustments.",
    flowDirection: "income",
    requiresTenantUnit: true,
  },
  {
    value: "maintenance_expense",
    label: "Maintenance expense",
    description: "Record outgoing payments to vendors for maintenance work.",
    flowDirection: "outgoing",
    requiresTenantUnit: true,
  },
  {
    value: "security_refund",
    label: "Security deposit refund",
    description: "Return all or part of the tenant’s deposit.",
    flowDirection: "outgoing",
    requiresTenantUnit: true,
  },
  {
    value: "fee",
    label: "Fee",
    description: "Apply late fees or processing fees to a tenant account.",
    flowDirection: "income",
    requiresTenantUnit: true,
  },
  {
    value: "other_income",
    label: "Other income",
    description: "Record miscellaneous inflows like parking or utilities.",
    flowDirection: "income",
    requiresTenantUnit: false,
  },
  {
    value: "other_outgoing",
    label: "Other outgoing",
    description: "Log miscellaneous outflows such as reimbursements.",
    flowDirection: "outgoing",
    requiresTenantUnit: false,
  },
  {
    value: "advance_rent",
    label: "Advance Rent",
    description: "Collect advance rent payment for future months. Automatically applies to invoices within the coverage period.",
    flowDirection: "income",
    requiresTenantUnit: true,
  },
];

const STATUS_OPTIONS = [
  "draft",
  "pending",
  "scheduled",
  "completed",
  "partial",
  "cancelled",
  "failed",
  "refunded",
];

const INITIAL_FORM = {
  payment_type: "",
  tenant_unit_id: "",
  amount: "",
  currency: getDefaultCurrency(),
  description: "",
  due_date: "",
  transaction_date: "",
  status: "pending",
  payment_method: "",
  reference_number: "",
  metadata: {},
  advance_rent_months: "",
  advance_rent_amount: "",
};

export default function CollectPaymentPage() {
  const router = useRouter();
  const { createPayment, loading, error } = useUnifiedPayments();
  const { templates, saveTemplate, deleteTemplate } = usePaymentTemplates();
  const {
    options: paymentMethodOptions,
    labels: paymentMethodLabels,
    loading: paymentMethodsLoading,
    error: paymentMethodsLoadError,
    refresh: refreshPaymentMethods,
  } = usePaymentMethods();
  // Currency options from environment configuration
  const currencyOptions = getCurrencyOptions();
  // Tenant units are automatically filtered by the logged-in owner's landlord_id on the backend.
  // The backend TenantUnitController filters by $request->user()->landlord_id,
  // ensuring only tenant units (and their associated properties) belonging to the current owner are returned.
  const {
    units: tenantUnits,
    loading: tenantUnitsLoading,
    error: tenantUnitsError,
    refresh: refreshTenantUnits,
  } = useTenantUnits();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submissionError, setSubmissionError] = useState(null);
  const [results, setResults] = useState([]);
  const [batch, setBatch] = useState([]);
  const [linkedCharge, setLinkedCharge] = useState(null);
  const [templateError, setTemplateError] = useState(null);

  const selectedType = useMemo(
    () => PAYMENT_TYPES.find((type) => type.value === formData.payment_type),
    [formData.payment_type]
  );
  const requiresTenant = !!selectedType?.requiresTenantUnit;

  const selectedTenantUnit = useMemo(() => {
    if (!formData.tenant_unit_id) {
      return null;
    }

    const id = Number(formData.tenant_unit_id);
    return tenantUnits.find((unit) => unit?.id === id) ?? null;
  }, [tenantUnits, formData.tenant_unit_id]);

  // Auto-calculate advance rent amount when months or tenant unit changes
  const [amountManuallyEdited, setAmountManuallyEdited] = useState(false);
  
  useEffect(() => {
    if (
      formData.payment_type === "advance_rent" &&
      formData.advance_rent_months &&
      selectedTenantUnit?.monthly_rent &&
      !amountManuallyEdited
    ) {
      const months = Number(formData.advance_rent_months);
      const monthlyRent = Number(selectedTenantUnit.monthly_rent);
      
      if (months > 0 && monthlyRent > 0) {
        const calculated = months * monthlyRent;
        setFormData((prev) => ({
          ...prev,
          advance_rent_amount: String(calculated),
        }));
      }
    }
  }, [formData.payment_type, formData.advance_rent_months, selectedTenantUnit, amountManuallyEdited]);

  // Reset manual edit flag when payment type changes
  useEffect(() => {
    if (formData.payment_type !== "advance_rent") {
      setAmountManuallyEdited(false);
    }
  }, [formData.payment_type]);

  const templatesForType = useMemo(() => {
    if (!formData.payment_type) {
      return templates;
    }

    return templates.filter(
      (template) => template.payment_type === formData.payment_type
    );
  }, [templates, formData.payment_type]);

  const {
    charges: pendingCharges,
    grouped: pendingChargesGrouped,
    loading: pendingChargesLoading,
    error: pendingChargesError,
    refresh: refreshPendingCharges,
  } = usePendingCharges(formData.tenant_unit_id, {
    enabled: step === 2 && Boolean(formData.tenant_unit_id),
  });

  useEffect(() => {
    if (!linkedCharge) {
      return;
    }

    const updated = pendingCharges.find((item) => item.id === linkedCharge.id);

    if (!updated) {
      setLinkedCharge(null);
      return;
    }

    if (updated !== linkedCharge) {
      setLinkedCharge(updated);
    }
  }, [pendingCharges, linkedCharge]);

  const pendingPayments = useMemo(() => {
    if (batch.length > 0) {
      return batch;
    }

    if (!formData.payment_type) {
      return [];
    }

    return [
      {
        id: "current",
        form: formData,
        summary: selectedTenantUnit
          ? buildTenantSummary(selectedTenantUnit)
          : null,
        charge: linkedCharge,
      },
    ];
  }, [batch, formData, selectedTenantUnit, linkedCharge]);

  const canAddToBatch =
    !!formData.payment_type &&
    (!requiresTenant || Boolean(formData.tenant_unit_id));

  const handleSelectType = (value) => {
    setFormData((current) => ({
      ...current,
      payment_type: value,
      // Clear tenant association if not needed
      tenant_unit_id: PAYMENT_TYPES.find((item) => item.value === value)
        ?.requiresTenantUnit
        ? current.tenant_unit_id
        : "",
    }));
    setFieldErrors({});
    setLinkedCharge(null);
    setStep(2);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    // Track manual edits to advance rent amount
    if (name === "advance_rent_amount") {
      setAmountManuallyEdited(true);
    } else if (name === "advance_rent_months") {
      setAmountManuallyEdited(false); // Reset when months change
    }
    
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSelectTenantUnit = (id) => {
    setFormData((current) => ({
      ...current,
      tenant_unit_id: id ? String(id) : "",
    }));
    setLinkedCharge(null);

    setFieldErrors((previous) => ({
      ...previous,
      tenant_unit_id: undefined,
    }));
  };

  const handleSelectCharge = (charge) => {
    if (!charge) {
      setLinkedCharge(null);
      return;
    }

    setLinkedCharge(charge);

    setFormData((current) => {
      const suggestedType =
        charge.suggested_payment_type &&
        PAYMENT_TYPES.some((type) => type.value === charge.suggested_payment_type)
          ? charge.suggested_payment_type
          : current.payment_type;

      const amountValue =
        charge.amount != null
          ? String(charge.amount)
          : charge.original_amount != null
          ? String(charge.original_amount)
          : current.amount;

      return {
        ...current,
        payment_type: suggestedType || current.payment_type,
        tenant_unit_id: charge.tenant_unit_id
          ? String(charge.tenant_unit_id)
          : current.tenant_unit_id,
        amount: amountValue,
        currency: charge.currency ?? current.currency ?? getDefaultCurrency(),
        due_date: charge.due_date ?? current.due_date,
        description:
          charge.description && charge.description.trim().length > 0
            ? charge.description
            : current.description,
        payment_method: charge.payment_method ?? current.payment_method,
      };
    });
    setFieldErrors({});
    setStep(2);
  };

  const handleClearCharge = () => {
    setLinkedCharge(null);
  };

  const handleAddToBatch = () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    const snapshot = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      form: { ...formData },
      summary: selectedTenantUnit
        ? buildTenantSummary(selectedTenantUnit)
        : null,
      charge: linkedCharge,
    };

    setBatch((current) => [...current, snapshot]);
    setFormData((current) => ({
      ...INITIAL_FORM,
      payment_type: current.payment_type,
      currency: current.currency,
      status: current.status,
    }));
    setLinkedCharge(null);
    setFieldErrors({});
  };

  const handleRemoveFromBatch = (id) => {
    setBatch((current) => current.filter((item) => item.id !== id));
  };

  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 1 && !formData.payment_type) {
      errors.payment_type = "Please choose a payment type to continue.";
    }

    if (currentStep === 2) {
      // Special validation for advance rent
      if (formData.payment_type === "advance_rent") {
        if (!formData.advance_rent_months || Number(formData.advance_rent_months) < 1 || Number(formData.advance_rent_months) > 12) {
          errors.advance_rent_months = "Advance rent months must be between 1 and 12.";
        }

        if (!formData.advance_rent_amount || Number(formData.advance_rent_amount) <= 0) {
          errors.advance_rent_amount = "Advance rent amount must be greater than 0.";
        }

        if (!formData.tenant_unit_id) {
          errors.tenant_unit_id = "Select a tenant and unit for advance rent collection.";
        }
      } else {
        // Regular payment validation
        if (!formData.amount || Number(formData.amount) <= 0) {
          errors.amount = "Amount must be greater than 0.";
        }

        if (!formData.currency || formData.currency.length !== 3) {
          errors.currency = "Currency should be a 3-letter ISO code.";
        }

        if (selectedType?.requiresTenantUnit && !formData.tenant_unit_id) {
          errors.tenant_unit_id = "Select a tenant and unit for this payment.";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToNext = () => {
    if (validateStep(step)) {
      setStep((current) => Math.min(current + 1, 3));
      setSubmissionError(null);
    }
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 1));
    setSubmissionError(null);
  };

  const resetFlow = () => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setFieldErrors({});
    setSubmissionError(null);
    setResults([]);
    setBatch([]);
    setLinkedCharge(null);
    setTemplateError(null);
  };

  const handleSubmit = async () => {
    const queue = pendingPayments;

    if (queue.length === 0) {
      if (!validateStep(2)) {
        setStep(2);
      }
      return;
    }

    if (queue.length === 1 && queue[0].id === "current") {
      if (!validateStep(2)) {
        setStep(2);
        return;
      }
    }

    const collected = [];

    try {
      for (const item of queue) {
        // Handle advance rent separately
        if (item.form.payment_type === "advance_rent") {
          const token = localStorage.getItem("auth_token");
          if (!token) {
            throw new Error("You must be logged in before collecting advance rent.");
          }

          if (!item.form.tenant_unit_id) {
            throw new Error("Please select a tenant unit.");
          }

          const payload = {
            advance_rent_months: Number(item.form.advance_rent_months),
            advance_rent_amount: Number(item.form.advance_rent_amount),
            payment_method: item.form.payment_method || null,
            transaction_date: item.form.transaction_date || new Date().toISOString().split("T")[0],
            reference_number: item.form.reference_number || null,
            notes: item.form.description || null,
          };

          const response = await fetch(
            `${API_BASE_URL}/tenant-units/${item.form.tenant_unit_id}/advance-rent`,
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }
          );

          if (response.status === 422) {
            const validationPayload = await response.json();
            setFieldErrors(normalizeErrors(validationPayload?.errors ?? {}));
            throw new Error(validationPayload?.message ?? "Validation failed.");
          }

          if (!response.ok) {
            const apiPayload = await response.json().catch(() => ({}));
            throw new Error(
              apiPayload?.message ??
              `Unable to collect advance rent (HTTP ${response.status}).`
            );
          }

          const responseData = await response.json();
          collected.push({
            response: { ...responseData, composite_id: `advance_rent:${item.form.tenant_unit_id}` },
            form: item.form,
            summary: item.summary,
            charge: item.charge,
          });
        } else {
          // Regular payment flow
          const payload = buildPayload(item.form, item.charge);
          const response = await createPayment(payload);
          collected.push({
            response,
            form: item.form,
            summary: item.summary,
            charge: item.charge,
          });
        }
      }

      setResults(collected);
      setBatch([]);
      setFormData(INITIAL_FORM);
      setLinkedCharge(null);
      setSubmissionError(null);
      setStep(4);
    } catch (err) {
      if (err?.details) {
        setFieldErrors(normalizeErrors(err.details));
      }
      setSubmissionError(err?.message ?? "Unable to submit payment.");
      setResults([]);
    }
  };

  const handleSaveTemplate = (name) => {
    if (!name?.trim()) {
      setTemplateError("Template name is required.");
      return;
    }

    if (!formData.payment_type) {
      setTemplateError("Select a payment type before saving a template.");
      return;
    }

    try {
      saveTemplate({
        name: name.trim(),
        payment_type: formData.payment_type,
        tenant_unit_id: selectedTenantUnit ? Number(selectedTenantUnit.id) : null,
        amount: formData.amount ? Number(formData.amount) : null,
        currency: formData.currency,
        payment_method: formData.payment_method || null,
        description: formData.description || "",
        metadata: formData.metadata ?? {},
      });
      setTemplateError(null);
    } catch (err) {
      setTemplateError(err?.message ?? "Unable to save template.");
    }
  };

  const handleApplyTemplate = (template) => {
    if (!template) return;

    setLinkedCharge(null);
    setFormData((current) => ({
      ...current,
      payment_type: template.payment_type ?? current.payment_type,
      tenant_unit_id: template.tenant_unit_id
        ? String(template.tenant_unit_id)
        : current.tenant_unit_id,
      amount:
        template.amount != null ? String(template.amount) : current.amount,
      currency: template.currency ?? current.currency,
      payment_method: template.payment_method ?? current.payment_method,
      description: template.description ?? current.description,
    }));

    setFieldErrors({});
  };

  const handleDeleteTemplate = (id) => {
    deleteTemplate(id);
  };

  const handleViewLedger = () => {
    if (results.length === 1) {
      const compositeId = results[0]?.response?.composite_id;
      if (compositeId) {
        router.push(`/unified-payments?composite_id=${compositeId}`);
        return;
      }
    }

    router.push("/unified-payments");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Collect payment
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Unified payment collection
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Initiate rent, refunds, fees, or vendor payouts from one guided
            flow. Choose a payment type to reveal tailored fields and confirm
            details before posting to the unified ledger.
          </p>
        </div>

        <Link
          href="/unified-payments"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={16} />
          Back to ledger
        </Link>
      </div>

      <StepIndicator currentStep={step} />

      {submissionError && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submissionError}
        </div>
      )}

      {error && step !== 4 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error.message}
        </div>
      )}

      {step === 1 && (
        <TypeSelection
          selected={formData.payment_type}
          errors={fieldErrors}
          onSelect={handleSelectType}
        />
      )}

      {step === 2 && (
        <DetailsForm
          formData={formData}
          selectedType={selectedType}
          errors={fieldErrors}
          onChange={handleChange}
          onNext={goToNext}
          onBack={goBack}
          tenantUnits={tenantUnits}
          tenantUnitsLoading={tenantUnitsLoading}
          tenantUnitsError={tenantUnitsError}
          onSelectTenantUnit={handleSelectTenantUnit}
          onRefreshTenantUnits={refreshTenantUnits}
          selectedTenantUnit={selectedTenantUnit}
          templates={templatesForType}
          onApplyTemplate={handleApplyTemplate}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          templateError={templateError}
          batch={batch}
          onAddToBatch={handleAddToBatch}
          onRemoveFromBatch={handleRemoveFromBatch}
          canAddToBatch={canAddToBatch}
          paymentMethodOptions={paymentMethodOptions}
          paymentMethodsLoading={paymentMethodsLoading}
          paymentMethodsError={paymentMethodsLoadError}
          onRefreshPaymentMethods={refreshPaymentMethods}
          currencyOptions={currencyOptions}
          pendingCharges={pendingCharges}
          pendingChargesGrouped={pendingChargesGrouped}
          pendingChargesLoading={pendingChargesLoading}
          pendingChargesError={pendingChargesError}
          onRefreshPendingCharges={refreshPendingCharges}
          onSelectCharge={handleSelectCharge}
          onClearCharge={handleClearCharge}
          selectedCharge={linkedCharge}
        />
      )}

      {step === 3 && (
        <ReviewStep
          payments={pendingPayments}
          loading={loading}
          onBack={goBack}
          onSubmit={handleSubmit}
          paymentMethodLabels={paymentMethodLabels}
        />
      )}

      {step === 4 && (
        <SuccessStep
          results={results}
          onNewPayment={resetFlow}
          onViewLedger={handleViewLedger}
          paymentMethodLabels={paymentMethodLabels}
        />
      )}
    </div>
  );
}

function StepIndicator({ currentStep }) {
  const steps = ["Choose payment type", "Enter details", "Review & confirm"];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isComplete = currentStep > stepNumber;

        return (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition ${
                isActive
                  ? "border-primary bg-primary text-white"
                  : isComplete
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {isComplete ? <CheckCircle2 size={16} /> : stepNumber}
            </span>
            <span
              className={`font-medium ${
                isActive ? "text-primary" : "text-slate-600"
              }`}
            >
              {label}
            </span>
            {stepNumber < steps.length && (
              <span className="mx-2 hidden h-px w-8 bg-slate-200 md:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypeSelection({ selected, onSelect, errors }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Pick the type of payment you want to process. We’ll tailor the rest of
        the form based on this choice.
      </p>

      {errors?.payment_type && (
        <p className="text-sm text-rose-600">{errors.payment_type}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PAYMENT_TYPES.map((type) => {
          const isSelected = selected === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onSelect(type.value)}
              className={`flex h-full flex-col rounded-2xl border p-4 text-left transition bg-white ${
                isSelected
                  ? "border-primary shadow-sm"
                  : "border-slate-200 hover:border-primary/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {type.label}
                </p>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {type.flowDirection === "income" ? "Incoming" : "Outgoing"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{type.description}</p>
              <span className="mt-4 text-xs font-medium text-slate-400">
                {type.requiresTenantUnit
                  ? "Requires tenant & unit details"
                  : "Standalone payment"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailsForm({
  formData,
  selectedType,
  errors,
  onChange,
  onNext,
  onBack,
  tenantUnits,
  tenantUnitsLoading,
  tenantUnitsError,
  onSelectTenantUnit,
  onRefreshTenantUnits,
  selectedTenantUnit,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  templateError,
  batch,
  onAddToBatch,
  onRemoveFromBatch,
  canAddToBatch,
  paymentMethodOptions,
  paymentMethodsLoading,
  paymentMethodsError,
  onRefreshPaymentMethods,
  currencyOptions,
  pendingCharges,
  pendingChargesGrouped,
  pendingChargesLoading,
  pendingChargesError,
  onRefreshPendingCharges,
  onSelectCharge,
  onClearCharge,
  selectedCharge,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5 md:grid-cols-2">
            {selectedType?.requiresTenantUnit && (
              <TenantUnitSelector
                value={formData.tenant_unit_id}
                units={tenantUnits}
                loading={tenantUnitsLoading}
                error={tenantUnitsError}
                onSelect={onSelectTenantUnit}
                onRefresh={onRefreshTenantUnits}
                errorMessage={errors?.tenant_unit_id}
                selectedUnit={selectedTenantUnit}
              />
            )}

            {formData.tenant_unit_id && selectedType?.value !== "advance_rent" && (
              <PendingChargesPanel
                charges={pendingCharges}
                grouped={pendingChargesGrouped}
                loading={pendingChargesLoading}
                error={pendingChargesError}
                onRefresh={onRefreshPendingCharges}
                onSelect={onSelectCharge}
                onClear={onClearCharge}
                selectedCharge={selectedCharge}
              />
            )}

            {selectedType?.value === "advance_rent" ? (
              <>
                {selectedTenantUnit && (
                  <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold text-primary mb-2">Lease Information</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Monthly Rent:</span>
                        <p className="font-semibold text-slate-900">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: formData.currency || getDefaultCurrency(),
                          }).format(Number(selectedTenantUnit.monthly_rent || 0))}
                        </p>
                      </div>
                      {selectedTenantUnit.advance_rent_amount > 0 && (
                        <div>
                          <span className="text-slate-500">Existing Advance Rent:</span>
                          <p className="font-semibold text-amber-600">
                            {new Intl.NumberFormat(undefined, {
                              style: "currency",
                              currency: formData.currency || getDefaultCurrency(),
                            }).format(Number(selectedTenantUnit.advance_rent_amount || 0))}
                            {" "}({selectedTenantUnit.advance_rent_months} months)
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Note: Collecting new advance rent will replace the existing amount.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <InputField
                  label="Advance Rent (Months)"
                  name="advance_rent_months"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={formData.advance_rent_months}
                  onChange={onChange}
                  placeholder="1"
                  error={errors?.advance_rent_months}
                  helper="Number of months to collect in advance (1-12)"
                />
                <InputField
                  label="Advance Rent Amount"
                  name="advance_rent_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advance_rent_amount}
                  onChange={onChange}
                  placeholder="0.00"
                  error={errors?.advance_rent_amount}
                  helper={
                    selectedTenantUnit && formData.advance_rent_months
                      ? `Auto-calculated: ${new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: formData.currency || getDefaultCurrency(),
                        }).format(
                          Number(selectedTenantUnit.monthly_rent || 0) *
                            Number(formData.advance_rent_months || 0)
                        )}`
                      : "Total amount to collect. Auto-calculated from months, but can be edited."
                  }
                />
              </>
            ) : (
              <InputField
                label="Amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={onChange}
                placeholder="0.00"
                error={errors?.amount}
              />
            )}

            {selectedType?.value !== "advance_rent" && (
              <InputField
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={onChange}
                as="select"
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </InputField>
            )}

            <PaymentMethodField
              value={formData.payment_method}
              onChange={onChange}
              options={paymentMethodOptions}
              loading={paymentMethodsLoading}
              error={paymentMethodsError}
              onRefresh={onRefreshPaymentMethods}
            />

            <InputField
              label="Reference number"
              name="reference_number"
              value={formData.reference_number}
              onChange={onChange}
              placeholder="Optional reference or invoice code"
            />

            {selectedType?.value !== "advance_rent" && (
              <InputField
                label="Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                as="select"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </InputField>
            )}

            <InputField
              label="Transaction date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={onChange}
              type="date"
              helper={
                selectedType?.value === "advance_rent"
                  ? "Date when advance rent was collected."
                  : "When the payment was received or paid out."
              }
            />

            {selectedType?.value !== "advance_rent" && (
              <InputField
                label="Due date"
                name="due_date"
                value={formData.due_date}
                onChange={onChange}
                type="date"
              />
            )}

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {selectedType?.value === "advance_rent" ? "Notes" : "Description"}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onChange}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={
                  selectedType?.value === "advance_rent"
                    ? "Additional notes about this advance rent collection..."
                    : "Add a short note about this payment..."
                }
              />
            </div>
          </div>

          <TemplatePanel
            templates={templates}
            onApply={onApplyTemplate}
            onSave={onSaveTemplate}
            onDelete={onDeleteTemplate}
            currentType={formData.payment_type}
            templateError={templateError}
            formData={formData}
            batch={batch}
            onAddToBatch={onAddToBatch}
            onRemoveFromBatch={onRemoveFromBatch}
            canAddToBatch={canAddToBatch}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          Review payment
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  payments,
  loading,
  onBack,
  onSubmit,
  paymentMethodLabels,
}) {
  const totalAmount = payments.reduce((acc, item) => {
    if (item.form.payment_type === "advance_rent") {
      return acc + (Number(item.form.advance_rent_amount ?? 0) || 0);
    }
    return acc + (Number(item.form.amount ?? 0) || 0);
  }, 0);
  const currency = payments[0]?.form?.currency ?? getDefaultCurrency();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Review payment details
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {payments.some((p) => p.form.payment_type === "advance_rent")
            ? "Double-check everything before collecting advance rent."
            : "Double-check everything before posting to the unified ledger."}
        </p>

        <div className="mt-6 space-y-3">
          {payments.map((item, index) => {
            const typeMeta = PAYMENT_TYPES.find(
              (type) => type.value === item.form.payment_type
            );
            const isAdvanceRent = item.form.payment_type === "advance_rent";
            const amountLabel = isAdvanceRent
              ? formatAmount(
                  Number(item.form.advance_rent_amount ?? 0),
                  item.form.currency ?? getDefaultCurrency()
                )
              : formatAmount(
                  Number(item.form.amount ?? 0),
                  item.form.currency ?? getDefaultCurrency()
                );
            const paymentMethodLabel = item.form.payment_method
              ? paymentMethodLabels?.get(item.form.payment_method) ??
                formatPaymentMethodLabel(item.form.payment_method)
              : null;
            const linkedCharge = item.charge;
            const chargeOriginalAmount = linkedCharge
              ? Number(
                  linkedCharge.original_amount ?? linkedCharge.amount ?? 0
                )
              : 0;
            const isPartialPayment =
              linkedCharge &&
              linkedCharge.supports_partial &&
              Number(item.form.amount ?? 0) + 0.009 < chargeOriginalAmount;
            const originalAmountLabel =
              linkedCharge && chargeOriginalAmount
                ? formatAmount(
                    chargeOriginalAmount,
                    linkedCharge.currency ?? item.form.currency ?? getDefaultCurrency()
                  )
                : null;
            const chargeTimelineParts = [];
            if (linkedCharge?.status) {
              chargeTimelineParts.push(`Status: ${linkedCharge.status}`);
            }
            if (linkedCharge?.due_date) {
              chargeTimelineParts.push(`Due: ${linkedCharge.due_date}`);
            } else if (linkedCharge?.issued_date) {
              chargeTimelineParts.push(`Issued: ${linkedCharge.issued_date}`);
            }
            const chargeTimelineLabel = chargeTimelineParts.join(" • ");

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {typeMeta?.label ?? item.form.payment_type ?? "Payment"} #
                      {index + 1}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.summary ??
                        (item.form.tenant_unit_id
                          ? `Tenant unit #${item.form.tenant_unit_id}`
                          : "No tenant selected")}
                    </p>
                    {isAdvanceRent && item.form.advance_rent_months && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.form.advance_rent_months} month
                        {Number(item.form.advance_rent_months) !== 1 ? "s" : ""} in advance
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {amountLabel}
                    </p>
                    {!isAdvanceRent && (
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        Status • {item.form.status}
                      </p>
                    )}
                    {paymentMethodLabel && (
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        Method • {paymentMethodLabel}
                      </p>
                    )}
                  </div>
                </div>
                {item.form.description && (
                  <p className="mt-3 text-xs text-slate-500">
                    {item.form.description}
                  </p>
                )}
                {linkedCharge && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/80">
                    <p className="font-semibold text-primary">
                      Linked charge • {linkedCharge.title ?? linkedCharge.id}
                    </p>
                    {chargeTimelineLabel && (
                      <p className="mt-1">{chargeTimelineLabel}</p>
                    )}
                    {originalAmountLabel && (
                      <p className="mt-1">
                        Original amount • {originalAmountLabel}
                        {isPartialPayment ? " (partial payment)" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-slate-50/80 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Total amount ({payments.length}{" "}
            {payments.length === 1 ? "payment" : "payments"})
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatAmount(totalAmount, currency)}
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {payments.some((p) => p.form.payment_type === "advance_rent")
            ? `Confirm & collect advance rent${payments.length > 1 ? "s" : ""}`
            : `Confirm & create ${payments.length > 1 ? "payments" : "payment"}`}
        </button>
      </div>
    </div>
  );
}

function SuccessStep({
  results,
  onNewPayment,
  onViewLedger,
  paymentMethodLabels,
}) {
  const count = results.length;
  const hasAdvanceRent = results.some((r) => r.form.payment_type === "advance_rent");
  const heading = hasAdvanceRent
    ? count === 1
      ? "Advance rent collected successfully"
      : "Payments collected successfully"
    : count === 1
    ? "Payment created successfully"
    : "Payments created successfully";

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CircleDollarSign size={28} />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-emerald-700">{heading}</h2>
      <p className="mt-2 text-sm text-emerald-700/90">
        {hasAdvanceRent
          ? `Advance rent has been recorded${count > 1 ? " for multiple tenant units" : ""}. Invoices within the coverage period will be automatically paid.`
          : `The unified ledger has been updated with${count === 1 ? " this payment." : ` these ${count} payments.`} You can review them or collect another payment right away.`}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onViewLedger}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          View in unified payments
        </button>
        <button
          type="button"
          onClick={onNewPayment}
          className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-900"
        >
          Collect another payment
        </button>
      </div>

      <div className="mt-6 space-y-2 text-left">
        {results.map((item, index) => {
          const typeMeta = PAYMENT_TYPES.find(
            (type) => type.value === item.form.payment_type
          );
          const amountLabel = formatAmount(
            Number(item.form.amount ?? 0),
            item.form.currency ?? "AED"
          );
          const paymentMethodLabel = item.form.payment_method
            ? paymentMethodLabels?.get(item.form.payment_method) ??
              formatPaymentMethodLabel(item.form.payment_method)
            : null;
          const linkedCharge = item.charge;
          const chargeOriginalAmount = linkedCharge
            ? Number(
                linkedCharge.original_amount ?? linkedCharge.amount ?? 0
              )
            : 0;
          const isPartialPayment =
            linkedCharge &&
            linkedCharge.supports_partial &&
            Number(item.form.amount ?? 0) + 0.009 < chargeOriginalAmount;
          const originalAmountLabel =
            linkedCharge && chargeOriginalAmount
              ? formatAmount(
                  chargeOriginalAmount,
                  linkedCharge.currency ?? item.form.currency ?? "MVR"
                )
              : null;

          return (
            <div
              key={`success-${item.response?.composite_id ?? index}`}
              className="rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-sm text-emerald-700"
            >
              <p className="font-semibold text-emerald-800">
                {typeMeta?.label ?? item.form.payment_type ?? "Payment"} #{index + 1}
              </p>
              <p className="text-xs text-emerald-600">
                {amountLabel} •{" "}
                {item.summary ??
                  (item.form.tenant_unit_id
                    ? `Tenant unit #${item.form.tenant_unit_id}`
                    : "No tenant")}
                {isAdvanceRent && item.form.advance_rent_months && (
                  <> • {item.form.advance_rent_months} month{Number(item.form.advance_rent_months) !== 1 ? "s" : ""}</>
                )}
              </p>
              {paymentMethodLabel && (
                <p className="text-xs uppercase tracking-wide text-emerald-500">
                  Method • {paymentMethodLabel}
                </p>
              )}
              {linkedCharge && (
                <p className="text-xs text-emerald-500">
                  Linked charge • {linkedCharge.title ?? linkedCharge.id}
                  {originalAmountLabel && (
                    <>
                      {" "}
                      ({originalAmountLabel}
                      {isPartialPayment ? " - partial" : ""})
                    </>
                  )}
                </p>
              )}
              {item.response?.reference_number && (
                <p className="text-xs uppercase tracking-wide text-emerald-500">
                  Reference • {item.response.reference_number}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TenantUnitSelector({
  value,
  units,
  loading,
  error,
  onSelect,
  onRefresh,
  errorMessage,
  selectedUnit,
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const displayedUnits = useMemo(() => {
    const sorted = [...units].sort((a, b) => {
      const nameA = a?.tenant?.full_name ?? "";
      const nameB = b?.tenant?.full_name ?? "";
      return nameA.localeCompare(nameB);
    });

    if (!normalizedQuery) {
      return sorted.slice(0, 6);
    }

    return sorted
      .filter((unit) => {
        const tenantName = unit?.tenant?.full_name ?? "";
        const unitNumber = unit?.unit?.unit_number ?? "";
        const propertyName = unit?.unit?.property?.name ?? "";

        return [tenantName, unitNumber, propertyName]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(normalizedQuery));
      })
      .slice(0, 8);
  }, [units, normalizedQuery]);

  const selectedId = value ? Number(value) : null;

  return (
    <div className="md:col-span-2">
      <label className="text-sm font-medium text-slate-700">
        Tenant & unit<span className="ml-1 text-rose-500">*</span>
      </label>
      <div className="mt-2 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tenant, unit number, or property"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {loading && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
            />
          )}
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:text-amber-900"
            >
              <RefreshCcw size={14} />
              Retry
            </button>
          </div>
        )}

        {errorMessage && (
          <p className="text-xs text-rose-600">{errorMessage}</p>
        )}

        <div className="grid gap-2 lg:grid-cols-2">
          {displayedUnits.map((unit) => {
            const id = unit?.id;
            const tenantName = unit?.tenant?.full_name ?? "Unknown tenant";
            const unitNumber = unit?.unit?.unit_number ?? "—";
            const propertyName = unit?.unit?.property?.name ?? "—";
            const isSelected = selectedId === id;

            return (
              <button
                key={`tenant-unit-${id}`}
                type="button"
                onClick={() => onSelect?.(id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 hover:border-primary/60 hover:bg-primary/5"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">
                  {tenantName}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Unit {unitNumber} • {propertyName}
                </span>
              </button>
            );
          })}
        </div>

        {!loading && displayedUnits.length === 0 && (
          <p className="text-sm text-slate-500">
            No tenants match your search. Try a different name or unit number.
          </p>
        )}

        {selectedUnit && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary/90">
            <p className="font-semibold text-primary">
              Selected tenant • {buildTenantSummary(selectedUnit)}
            </p>
            <p className="mt-1 text-xs text-primary/70">
              Lease status: {selectedUnit?.status ?? "Unknown"} • ID #
              {selectedUnit?.id ?? "—"}
            </p>
            <button
              type="button"
              onClick={() => onSelect?.(null)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildTenantSummary(unit) {
  const tenantName = unit?.tenant?.full_name ?? "Unknown tenant";
  const unitNumber = unit?.unit?.unit_number ?? "—";
  const propertyName = unit?.unit?.property?.name ?? "—";
  return `${tenantName} • ${unitNumber} @ ${propertyName}`;
}

function normalizeErrors(details) {
  if (!details || typeof details !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(" ") : value,
    ])
  );
}

function buildPayload(form, charge) {
  const baseMetadata =
    form.metadata && typeof form.metadata === "object" && !Array.isArray(form.metadata)
      ? { ...form.metadata }
      : {};

  if (charge) {
    baseMetadata.source_type = charge.source_type ?? baseMetadata.source_type;
    baseMetadata.source_id = charge.source_id ?? baseMetadata.source_id;
    baseMetadata.source_title = charge.title ?? baseMetadata.source_title;
    baseMetadata.source_status = charge.status ?? baseMetadata.source_status;
    baseMetadata.source_due_date = charge.due_date ?? baseMetadata.source_due_date;
    baseMetadata.source_issued_date =
      charge.issued_date ?? baseMetadata.source_issued_date;
    baseMetadata.source_original_amount =
      charge.original_amount ?? charge.amount ?? baseMetadata.source_original_amount;
    baseMetadata.partial_payment =
      charge.supports_partial &&
      Number(form.amount ?? 0) + 0.009 <
        Number(charge.original_amount ?? charge.amount ?? 0);
  }

  const metadata = Object.fromEntries(
    Object.entries(baseMetadata).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );

  // Extract source_type and source_id from metadata for direct payload fields
  const sourceType = metadata.source_type ?? null;
  const sourceId = metadata.source_id ?? null;

  return {
    payment_type: form.payment_type,
    tenant_unit_id: form.tenant_unit_id ? Number(form.tenant_unit_id) : null,
    amount: Number(form.amount),
    currency: form.currency,
    description: form.description || null,
    due_date: form.due_date || null,
    transaction_date: form.transaction_date || null,
    status: form.status,
    payment_method: form.payment_method || null,
    reference_number: form.reference_number || null,
    source_type: sourceType,
    source_id: sourceId,
    metadata,
  };
}

function formatAmount(value, currency) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? getDefaultCurrency(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? getDefaultCurrency()}`;
  }
}

function TemplatePanel({
  templates,
  onApply,
  onSave,
  onDelete,
  currentType,
  templateError,
  formData,
  batch,
  onAddToBatch,
  onRemoveFromBatch,
  canAddToBatch,
}) {
  const [name, setName] = useState("");

  const handleSaveClick = () => {
    if (!onSave) return;

    try {
      onSave(name);
      setName("");
    } catch {
      // handled upstream
    }
  };

  const canSave =
    currentType &&
    name.trim().length > 0 &&
    formData.amount &&
    Number(formData.amount) > 0;
  const batchCount = batch?.length ?? 0;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-sm">
      <div className="flex items-center gap-2">
        <BookmarkPlus size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">
          Saved templates
        </h3>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Save frequently used payment setups or apply an existing template to
        prefill the form. You can also queue multiple payments for bulk
        submission.
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onAddToBatch}
          disabled={!canAddToBatch}
          className="w-full rounded-lg border border-primary/40 bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add current payment to batch
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Template name
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Monthly rent - 2BR"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={!canSave}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save template for this type
        </button>
        {templateError && (
          <p className="text-xs text-rose-600">{templateError}</p>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Templates ({templates.length})
        </p>

        {templates.length === 0 && (
          <p className="text-xs text-slate-500">
            {currentType
              ? "No templates saved for this payment type yet."
              : "Select a payment type to view relevant templates."}
          </p>
        )}

        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {template.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {template.payment_type} •{" "}
                    {template.amount != null
                      ? `${template.amount} ${template.currency}`
                      : "No amount preset"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApply?.(template)}
                    className="rounded-lg border border-primary/40 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(template.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-500 transition hover:bg-rose-50"
                    aria-label={`Delete template ${template.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Batch queue ({batchCount})
        </p>

        {batchCount === 0 && (
          <p className="text-xs text-slate-500">
            Add payments to the batch to submit multiple records at once.
          </p>
        )}

        <div className="space-y-2">
          {batch?.map((item, index) => {
            const typeMeta = PAYMENT_TYPES.find(
              (type) => type.value === item.form.payment_type
            );
            const amountLabel = formatAmount(
              Number(item.form.amount ?? 0),
              item.form.currency ?? getDefaultCurrency()
            );

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {typeMeta?.label ?? item.form.payment_type ?? "Payment"} #
                      {index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      {amountLabel} •{" "}
                      {item.summary ??
                        (item.form.tenant_unit_id
                          ? `Tenant unit #${item.form.tenant_unit_id}`
                          : "No tenant selected")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFromBatch?.(item.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-500 transition hover:bg-rose-50"
                    aria-label={`Remove batch item ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function PendingChargesPanel({
  charges,
  grouped,
  loading,
  error,
  onRefresh,
  onSelect,
  onClear,
  selectedCharge,
}) {
  const hasCharges = Array.isArray(charges) && charges.length > 0;
  const sections = [
    { key: "rent_invoice", label: "Rent invoices" },
    { key: "financial_record", label: "Financial records" },
  ];

  const getItemsForKey = (key) => {
    if (grouped?.get instanceof Function) {
      return grouped.get(key) ?? [];
    }

    return Array.isArray(charges)
      ? charges.filter((item) => item.source_type === key)
      : [];
  };

  return (
    <div className="md:col-span-2">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Pending charges
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select an unpaid invoice or fee to prefill the payment form.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin text-primary" />}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 font-semibold text-amber-700 transition hover:border-amber-300 hover:text-amber-900"
            >
              <RefreshCcw size={14} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && !hasCharges && (
          <p className="text-xs text-slate-500">
            No pending charges were found for this tenant. You can still collect
            a payment by filling in the details manually.
          </p>
        )}

        {sections.map(({ key, label }) => {
          const items = getItemsForKey(key);
          if (!items.length) {
            return null;
          }

          return (
            <div key={key} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label} ({items.length})
              </p>

              <div className="space-y-2">
                {items.map((charge) => {
                  const isSelected = selectedCharge?.id === charge.id;
                  const amountLabel = formatAmount(
                    Number(charge.amount ?? charge.original_amount ?? 0),
                    charge.currency ?? getDefaultCurrency()
                  );
                  const originalAmountLabel =
                    charge.original_amount != null &&
                    charge.original_amount !== charge.amount
                      ? formatAmount(
                          Number(charge.original_amount),
                          charge.currency ?? getDefaultCurrency()
                        )
                      : null;
                  const dueLabel = charge.due_date ?? charge.issued_date ?? null;

                  return (
                    <div
                      key={charge.id}
                      className={`flex flex-col gap-2 rounded-xl border p-3 transition ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-200 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {charge.title ?? "Charge"}
                          </p>
                          {charge.description && (
                            <p className="mt-1 text-xs text-slate-500">
                              {charge.description}
                            </p>
                          )}
                          {dueLabel && (
                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                              Due • {dueLabel}
                            </p>
                          )}
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                            Status • {charge.status ?? "pending"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {amountLabel}
                          </p>
                          {originalAmountLabel && (
                            <p className="mt-1 text-xs text-slate-500">
                              Original • {originalAmountLabel}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {charge.metadata?.invoice_number ??
                            charge.metadata?.category ??
                            "—"}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            <CheckCircle2 size={14} />
                            Selected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelect?.(charge)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                          >
                            Use this charge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {selectedCharge && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              <RefreshCcw size={14} />
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentMethodField({
  value,
  onChange,
  options = [],
  loading,
  error,
  onRefresh,
}) {
  const hasSelectedOption =
    value && options.some((option) => option.value === value);
  const fallbackLabel =
    value && !hasSelectedOption ? formatPaymentMethodLabel(value) : null;

  const helper =
    loading && options.length === 0
      ? "Fetching payment methods..."
      : !loading && options.length === 0
      ? "No active payment methods found. Add one in settings to enable selection."
      : undefined;

  return (
    <div className="space-y-2">
      <InputField
        label="Payment method"
        name="payment_method"
        value={value}
        onChange={onChange}
        as="select"
        disabled={loading}
        helper={helper}
      >
        <option value="">
          {loading ? "Loading payment methods..." : "Select a payment method"}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {value && !hasSelectedOption && (
          <option value={value}>{fallbackLabel ?? value}</option>
        )}
      </InputField>
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="flex-1">{error}</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 font-semibold text-amber-700 transition hover:border-amber-300 hover:text-amber-900"
            >
              <RefreshCcw size={14} />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function InputField({
  label,
  name,
  value,
  onChange,
  error,
  helper,
  as = "input",
  ...props
}) {
  const Component = as;
  return (
    <label className="flex flex-col text-sm font-medium text-slate-700">
      {label}
      <Component
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        {...props}
      />
      {helper && <span className="mt-1 text-xs font-normal text-slate-400">{helper}</span>}
      {error && <span className="mt-1 text-xs font-normal text-rose-600">{error}</span>}
    </label>
  );
}

function ReviewItem({ label, value, capitalize = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-2 text-sm font-semibold text-slate-800 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}




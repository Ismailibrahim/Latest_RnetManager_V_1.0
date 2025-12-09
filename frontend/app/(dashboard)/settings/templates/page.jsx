"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  Plus,
  Star,
  Trash2,
  Eye,
  ArrowLeft,
  Copy,
  Code,
  X,
} from "lucide-react";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";

const TEMPLATE_TYPES = {
  rent_invoice: "Rent Invoice",
  maintenance_invoice: "Maintenance Invoice",
  security_deposit_slip: "Security Deposit Slip",
  advance_rent_receipt: "Advance Rent Receipt",
  fee_collection_receipt: "Fee Collection Receipt",
  security_deposit_refund: "Security Deposit Refund",
  other_income_receipt: "Other Income Receipt",
  payment_voucher: "Payment Voucher",
  unified_payment_entry: "Unified Payment Entry",
};

// Available placeholders for each template type
const AVAILABLE_PLACEHOLDERS = {
  rent_invoice: [
    { name: "company.name", description: "Company name" },
    { name: "company.address", description: "Company address" },
    { name: "company.phone", description: "Company phone" },
    { name: "company.email", description: "Company email" },
    { name: "customer.name", description: "Customer/tenant name" },
    { name: "customer.phone", description: "Customer phone" },
    { name: "customer.email", description: "Customer email" },
    { name: "document.number", description: "Invoice number" },
    { name: "document.date", description: "Invoice date" },
    { name: "document.due_date", description: "Due date" },
    { name: "document.status", description: "Invoice status" },
    { name: "document.payment_method", description: "Payment method" },
    { name: "amount.rent", description: "Rent amount" },
    { name: "amount.late_fee", description: "Late fee" },
    { name: "amount.total", description: "Total amount" },
    { name: "amount.amount_due", description: "Amount due" },
    { name: "amount.currency", description: "Currency code" },
    { name: "unit.number", description: "Unit number" },
    { name: "property.name", description: "Property name" },
    { name: "advance_rent.applied", description: "Advance rent applied (Yes/No)" },
    { name: "advance_rent.amount", description: "Advance rent amount" },
  ],
  maintenance_invoice: [
    { name: "company.name", description: "Company name" },
    { name: "company.address", description: "Company address" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Invoice number" },
    { name: "document.date", description: "Invoice date" },
    { name: "amount.labor_cost", description: "Labor cost" },
    { name: "amount.parts_cost", description: "Parts cost" },
    { name: "amount.tax", description: "Tax amount" },
    { name: "amount.discount", description: "Discount amount" },
    { name: "amount.total", description: "Grand total" },
    { name: "unit.number", description: "Unit number" },
    { name: "property.name", description: "Property name" },
  ],
  security_deposit_slip: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Receipt number" },
    { name: "document.date", description: "Date" },
    { name: "amount.total", description: "Deposit amount" },
    { name: "amount.currency", description: "Currency" },
    { name: "unit.number", description: "Unit number" },
  ],
  advance_rent_receipt: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Receipt number" },
    { name: "amount.total", description: "Amount received" },
    { name: "advance_rent.months", description: "Number of months" },
    { name: "advance_rent.amount", description: "Advance rent amount" },
  ],
  fee_collection_receipt: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Receipt number" },
    { name: "amount.total", description: "Fee amount" },
    { name: "payment.description", description: "Fee description" },
  ],
  security_deposit_refund: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Refund number" },
    { name: "amount.original_deposit", description: "Original deposit" },
    { name: "amount.deductions", description: "Deductions" },
    { name: "amount.total", description: "Refund amount" },
  ],
  other_income_receipt: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer name" },
    { name: "document.number", description: "Receipt number" },
    { name: "amount.total", description: "Amount received" },
    { name: "payment.description", description: "Income description" },
  ],
  payment_voucher: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Payee name" },
    { name: "document.number", description: "Voucher number" },
    { name: "amount.total", description: "Amount paid" },
    { name: "payment.type", description: "Payment type" },
  ],
  unified_payment_entry: [
    { name: "company.name", description: "Company name" },
    { name: "customer.name", description: "Customer/Payee name" },
    { name: "document.number", description: "Document number" },
    { name: "document.type", description: "Document type (Receipt/Voucher)" },
    { name: "amount.total", description: "Amount" },
    { name: "payment.type", description: "Payment type" },
    { name: "payment.flow_direction", description: "Flow direction (income/outgoing)" },
  ],
};

// Common placeholders available for all types
const COMMON_PLACEHOLDERS = [
  { name: "company.name", description: "Company name from settings" },
  { name: "company.address", description: "Company address" },
  { name: "company.phone", description: "Company phone" },
  { name: "company.email", description: "Company email" },
  { name: "customer.name", description: "Customer/tenant name" },
  { name: "customer.phone", description: "Customer phone" },
  { name: "customer.email", description: "Customer email" },
  { name: "unit.number", description: "Unit number" },
  { name: "property.name", description: "Property name" },
];

export default function DocumentTemplatesPage() {
  const {
    templates,
    defaults,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,
    preview,
    refetch,
  } = useDocumentTemplates();

  const [selectedType, setSelectedType] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    template_html: "",
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    refetch(selectedType);
  }, [selectedType, refetch]);

  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timeout = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timeout);
    }
  }, [errorMessage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorMessage("");
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || "",
      type: template.type || "",
      template_html: template.template_html || "",
      is_default: template.is_default || false,
    });
    setShowEditor(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCopyFromDefault = (defaultTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${defaultTemplate.name} (Custom)`,
      type: defaultTemplate.type || "",
      template_html: defaultTemplate.template_html || "",
      is_default: false,
    });
    setShowEditor(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "",
      template_html: "",
      is_default: false,
    });
    setShowEditor(false);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        setSuccessMessage("Document template updated successfully.");
      } else {
        await createTemplate(formData);
        setSuccessMessage("Document template created successfully.");
      }
      await refetch(selectedType);
      handleCancel();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save document template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setDeleting(id);
    setErrorMessage("");

    try {
      await deleteTemplate(id);
      setSuccessMessage("Document template deleted successfully.");
      await refetch(selectedType);
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete document template.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id) => {
    setErrorMessage("");

    try {
      await setDefault(id);
      setSuccessMessage("Template set as default successfully.");
      await refetch(selectedType);
    } catch (err) {
      setErrorMessage(err.message || "Failed to set default template.");
    }
  };

  const handlePreview = async (template) => {
    setPreviewing(template.id);
    setErrorMessage("");

    try {
      const result = await preview(template.id);
      setPreviewHtml(result.html);
      setShowPreview(template.id);
    } catch (err) {
      setErrorMessage(err.message || "Failed to preview template.");
    } finally {
      setPreviewing(null);
    }
  };

  const filteredTemplates = selectedType
    ? templates.filter((t) => t.type === selectedType)
    : templates;

  const defaultTemplateForType = selectedType
    ? defaults.find((t) => t.type === selectedType)
    : null;

  // Combine placeholders and remove duplicates based on name
  const placeholders = selectedType
    ? (() => {
        const combined = [
          ...COMMON_PLACEHOLDERS,
          ...(AVAILABLE_PLACEHOLDERS[selectedType] || []),
        ];
        // Remove duplicates by name, keeping the first occurrence
        const seen = new Set();
        return combined.filter((p) => {
          if (seen.has(p.name)) {
            return false;
          }
          seen.add(p.name);
          return true;
        });
      })()
    : COMMON_PLACEHOLDERS;

  if (loading && !templates.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </Link>
        </div>
      </div>

      <section className="card flex flex-col gap-6">
        <div className="space-y-2">
          <div className="badge">
            <FileText size={14} />
            Document Templates
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Document Templates
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Customize the HTML templates used for printing invoices, receipts, and vouchers.
            Use placeholders like {"{{company.name}}"} to insert dynamic data.
          </p>
        </div>
      </section>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">
                Unable to load templates
              </p>
              <p className="text-xs text-red-600">
                {error?.message || "An error occurred while loading templates."}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="border-b border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Template Types
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelectedType(null);
                setShowEditor(true);
                handleCancel();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <Plus size={16} />
              Create Template
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedType === null
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Types
            </button>
            {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedType === key
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {selectedType && defaultTemplateForType && (
          <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Default Template: {defaultTemplateForType.name}
                </h3>
                <p className="text-xs text-blue-700">
                  This is the system default template. You can copy it to create
                  a custom version.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyFromDefault(defaultTemplateForType)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          </div>
        )}

        {showEditor && (
          <div className="mb-6 p-6 rounded-lg border border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="My Custom Invoice Template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    disabled={!!editingTemplate}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select type...</option>
                    {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    HTML Template
                  </label>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Code size={14} />
                    Use {"{{placeholder}}"} syntax
                  </div>
                </div>
                <textarea
                  name="template_html"
                  value={formData.template_html}
                  onChange={handleChange}
                  required
                  rows={20}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-mono text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="<!doctype html>...&#10;Use {{company.name}}, {{customer.name}}, etc."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Enter complete HTML document. Use placeholders like {"{{company.name}}"} for dynamic content.
                </p>
              </div>

              {selectedType && placeholders.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Available Placeholders
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {placeholders.map((placeholder, index) => (
                      <div
                        key={`placeholder-${selectedType || 'all'}-${placeholder.name}-${index}`}
                        className="flex items-start gap-2 text-xs"
                      >
                        <code className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono">
                          {"{{" + placeholder.name + "}}"}
                        </code>
                        <span className="text-slate-600 text-xs">
                          {placeholder.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                <label
                  htmlFor="is_default"
                  className="text-sm font-medium text-slate-700"
                >
                  Set as default template for this type
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredTemplates.length === 0 && !showEditor ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm font-medium">
              {selectedType
                ? `No custom templates for ${TEMPLATE_TYPES[selectedType]}.`
                : "No custom templates found."}
            </p>
            <p className="text-xs mt-1">
              {selectedType
                ? "Create a custom template or use the default."
                : "Select a template type to get started."}
            </p>
          </div>
        ) : (
          !showEditor && (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {template.name}
                      </h3>
                      {template.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          <Star size={12} fill="currentColor" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Type: {TEMPLATE_TYPES[template.type] || template.type}
                    </p>
                    <p className="text-xs text-slate-400 font-mono line-clamp-2">
                      {template.template_html.substring(0, 100)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handlePreview(template)}
                      disabled={previewing === template.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {previewing === template.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Eye size={14} />
                      )}
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(template)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    {!template.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(template.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        <Star size={14} />
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      disabled={deleting === template.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleting === template.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {showPreview && previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Template Preview
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(null);
                  setPreviewHtml(null);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="print-preview"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const win = window.open("", "_blank");
                  win.document.write(previewHtml);
                  win.document.close();
                  win.print();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <FileText size={16} />
                Print Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(null);
                  setPreviewHtml(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

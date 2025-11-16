"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useSmsTemplates } from "@/hooks/useSmsTemplates";

const TEMPLATE_TYPES = {
  rent_due: "Rent Due",
  rent_received: "Rent Received",
  maintenance_request: "Maintenance Request",
  lease_expiry: "Lease Expiry",
  security_deposit: "Security Deposit",
  system: "System",
};

// Available variables for each template type
const AVAILABLE_VARIABLES = {
  rent_due: [
    { name: "tenant_name", description: "Tenant's full name" },
    { name: "amount", description: "Rent amount due" },
    { name: "due_date", description: "Due date for rent payment" },
    { name: "property_name", description: "Property name" },
    { name: "unit_number", description: "Unit number" },
    { name: "invoice_number", description: "Invoice number" },
  ],
  rent_received: [
    { name: "tenant_name", description: "Tenant's full name" },
    { name: "amount", description: "Amount received" },
    { name: "payment_date", description: "Date of payment" },
    { name: "property_name", description: "Property name" },
    { name: "unit_number", description: "Unit number" },
    { name: "invoice_number", description: "Invoice number" },
    { name: "payment_method", description: "Payment method used" },
  ],
  maintenance_request: [
    { name: "tenant_name", description: "Tenant's full name" },
    { name: "request_id", description: "Maintenance request ID" },
    { name: "property_name", description: "Property name" },
    { name: "unit_number", description: "Unit number" },
    { name: "issue_description", description: "Description of the issue" },
    { name: "priority", description: "Request priority level" },
  ],
  lease_expiry: [
    { name: "tenant_name", description: "Tenant's full name" },
    { name: "expiry_date", description: "Lease expiry date" },
    { name: "property_name", description: "Property name" },
    { name: "unit_number", description: "Unit number" },
    { name: "days_remaining", description: "Days until lease expires" },
  ],
  security_deposit: [
    { name: "tenant_name", description: "Tenant's full name" },
    { name: "amount", description: "Security deposit amount" },
    { name: "property_name", description: "Property name" },
    { name: "unit_number", description: "Unit number" },
    { name: "status", description: "Deposit status (refunded, held, etc.)" },
  ],
  system: [
    { name: "message", description: "System message content" },
    { name: "date", description: "Current date" },
    { name: "time", description: "Current time" },
  ],
  // Common variables available for all types
  common: [
    { name: "company_name", description: "Your company name" },
    { name: "landlord_name", description: "Landlord name" },
  ],
};

export default function SmsTemplatesPage() {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,
    preview,
    refetch,
  } = useSmsTemplates();

  const [selectedType, setSelectedType] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    message: "",
    variables: [],
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      message: template.message || "",
      variables: template.variables || [],
      is_default: template.is_default || false,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "",
      message: "",
      variables: [],
      is_default: false,
    });
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
        setSuccessMessage("SMS template updated successfully.");
      } else {
        await createTemplate(formData);
        setSuccessMessage("SMS template created successfully.");
      }
      await refetch(selectedType);
      handleCancel();
    } catch (err) {
      setErrorMessage(err.message || "Failed to save SMS template.");
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
      setSuccessMessage("SMS template deleted successfully.");
      await refetch(selectedType);
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete SMS template.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id) => {
    setErrorMessage("");

    try {
      await setDefault(id);
      setSuccessMessage("Default template updated successfully.");
      await refetch(selectedType);
    } catch (err) {
      setErrorMessage(err.message || "Failed to set default template.");
    }
  };

  const handlePreview = async (template) => {
    setShowPreview(template.id);
    setPreviewData(null);
    setErrorMessage("");

    try {
      const result = await preview(template.id);
      setPreviewData(result.data?.rendered_message || result.rendered_message || "");
    } catch (err) {
      setErrorMessage(err.message || "Failed to preview template.");
    }
  };

  const filteredTemplates = selectedType
    ? templates.filter((t) => t.type === selectedType)
    : templates;

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading SMS templates...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href="/settings/sms"
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="badge">
                <MessageSquare size={14} />
                SMS Templates
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Manage SMS Templates
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Create and manage SMS message templates for different notification types.
              Use variables like {"{"}tenant_name{"}"}, {"{"}amount{"}"} to personalize messages.
            </p>
          </div>
          {!editingTemplate && (
            <button
              onClick={() => setEditingTemplate({})}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <Plus size={16} />
              New Template
            </button>
          )}
        </div>
      </section>

      {successMessage && (
        <div className="card flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/80 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-semibold text-green-700">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="card flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
        </div>
      )}

      {editingTemplate !== null && (
        <section className="card space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingTemplate?.id ? "Edit Template" : "Create New Template"}
            </h2>
            <p className="text-sm text-slate-500">
              {editingTemplate?.id
                ? "Update the SMS template details below."
                : "Fill in the details to create a new SMS template."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-slate-700 mb-1"
                >
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Rent Due Reminder"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-semibold text-slate-700 mb-1"
                >
                  Notification Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select type (optional)</option>
                  {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Message Body <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Enter your SMS message. Use variables like {{tenant_name}}, {{amount}}, {{property_name}}, etc."
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                SMS messages are limited to 160 characters. Use variables in double curly braces like {"{{"}variable_name{"}}"}.
              </p>
              
              {/* Available Variables Section */}
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Available Variables
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const varsSection = e.currentTarget.closest('.rounded-lg').querySelector('.variables-list');
                      varsSection.classList.toggle('hidden');
                    }}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Show/Hide
                  </button>
                </div>
                <div className="variables-list space-y-3">
                  {formData.type && AVAILABLE_VARIABLES[formData.type] && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        {TEMPLATE_TYPES[formData.type]} Variables:
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {AVAILABLE_VARIABLES[formData.type].map((variable) => (
                          <div
                            key={variable.name}
                            className="flex items-start gap-2 rounded bg-white p-2 border border-slate-200"
                          >
                            <code className="text-xs font-mono text-primary flex-shrink-0">
                              {"{{"}
                              {variable.name}
                              {"}}"}
                            </code>
                            <span className="text-xs text-slate-600">
                              {variable.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      Common Variables (Available for all types):
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {AVAILABLE_VARIABLES.common.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-start gap-2 rounded bg-white p-2 border border-slate-200"
                        >
                          <code className="text-xs font-mono text-primary flex-shrink-0">
                            {"{{"}
                            {variable.name}
                            {"}}"}
                          </code>
                          <span className="text-xs text-slate-600">
                            {variable.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!formData.type && (
                    <p className="text-xs text-slate-500 italic">
                      Select a notification type above to see type-specific variables.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor="is_default"
                className="text-sm font-medium text-slate-700"
              >
                Set as default template for this type
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    {editingTemplate?.id ? "Update Template" : "Create Template"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Types</option>
            {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              No SMS templates found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedType
                ? `No templates for ${TEMPLATE_TYPES[selectedType] || selectedType}.`
                : "Create your first SMS template to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {template.name}
                      </h3>
                      {template.is_default && (
                        <span className="badge">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          Default
                        </span>
                      )}
                      {template.type && (
                        <span className="badge text-xs">
                          {TEMPLATE_TYPES[template.type] || template.type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {template.message}
                    </p>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600"
                          >
                            {"{"}
                            {variable}
                            {"}"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                        title="Set as default"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deleting === template.id}
                      className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === template.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {showPreview === template.id && previewData && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Preview:</p>
                    <p className="text-sm text-slate-700">{previewData}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


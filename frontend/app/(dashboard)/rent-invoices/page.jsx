"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Clock4,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { usePaymentMethods, formatPaymentMethodLabel } from "@/hooks/usePaymentMethods";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "generated", label: "Generated" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const initialFormState = {
  tenant_unit_id: "",
  invoice_number: "",
  billing_month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  invoice_date: formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  due_date: formatDateInput(addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 5)),
  rent_amount: "",
  late_fee: "",
  status: "generated",
  paid_date: "",
};

export default function RentInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const [tenantUnits, setTenantUnits] = useState([]);
  const [tenantUnitsLoading, setTenantUnitsLoading] = useState(false);
  const [tenantUnitsError, setTenantUnitsError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);
  const [formNameDirty, setFormNameDirty] = useState(false);

  const [flashMessage, setFlashMessage] = useState(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const previewRef = useRef(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [bulkFormValues, setBulkFormValues] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return {
      billing_month: `${year}-${month}`,
      invoice_date: formatDateInput(new Date(year, today.getMonth(), 1)),
      due_date: formatDateInput(addDays(new Date(year, today.getMonth(), 1), 5)),
      late_fee: "",
      status: "generated",
      skip_existing: true,
    };
  });
  const [bulkFormErrors, setBulkFormErrors] = useState({});
  const [bulkFormSubmitting, setBulkFormSubmitting] = useState(false);
  const [bulkFormApiError, setBulkFormApiError] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const { labels: paymentMethodLabels } = usePaymentMethods({ onlyActive: true });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchInvoices() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "Please log in so we can load rent invoices from the API.",
          );
        }

        const url = new URL(`${API_BASE_URL}/rent-invoices`);
        url.searchParams.set("per_page", "50");

        if (statusFilter !== "all") {
          url.searchParams.set("status", statusFilter);
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
          const message =
            payload?.message ??
            `Unable to load invoices (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setInvoices(data);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInvoices();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenantUnits() {
      setTenantUnitsLoading(true);
      setTenantUnitsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "Please log in so we can load tenant unit information.",
          );
        }

        const url = new URL(`${API_BASE_URL}/tenant-units`);
        url.searchParams.set("per_page", "200");
        url.searchParams.set("status", "active");

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
            `Unable to load tenant units (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        setTenantUnits(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) return;
        setTenantUnitsError(err.message);
      } finally {
        if (isMounted) {
          setTenantUnitsLoading(false);
        }
      }
    }

    fetchTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!flashMessage) return;

    const timeout = setTimeout(() => setFlashMessage(null), 3200);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const tenantUnitMap = useMemo(() => {
    return tenantUnits.reduce((accumulator, unit) => {
      if (unit?.id) {
        accumulator.set(unit.id, unit);
      }
      return accumulator;
    }, new Map());
  }, [tenantUnits]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query.length === 0) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const tenantName =
        invoice?.tenant_unit?.tenant?.full_name ??
        tenantUnitMap.get(invoice?.tenant_unit_id)?.tenant?.full_name ??
        "";
      const unitNumber =
        invoice?.tenant_unit?.unit?.unit_number ??
        tenantUnitMap.get(invoice?.tenant_unit_id)?.unit?.unit_number ??
        "";

      return [
        invoice?.invoice_number,
        tenantName,
        unitNumber,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [invoices, search, tenantUnitMap]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce(
      (accumulator, invoice) => {
        accumulator.total += 1;

        const rent = toAmount(invoice?.rent_amount);
        const late = toAmount(invoice?.late_fee);
        const invoiceTotal = rent + late;

        if (!["paid", "cancelled"].includes(invoice?.status ?? "")) {
          accumulator.outstanding += invoiceTotal;
        }

        if (invoice?.status === "paid") {
          accumulator.collected += invoiceTotal;
        }

        if (invoice?.status === "overdue") {
          accumulator.overdue += 1;
        }

        return accumulator;
      },
      { total: 0, outstanding: 0, collected: 0, overdue: 0 },
    );
  }, [filteredInvoices]);

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setRefreshKey((value) => value + 1);
  };

  const handleLoadMore = async () => {
    if (!pagination.nextUrl) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "Please log in so we can load additional invoices.",
        );
      }

      const response = await fetch(pagination.nextUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to load more invoices (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setInvoices((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const merged = [...previous];

        data.forEach((item) => {
          if (item?.id && !existingIds.has(item.id)) {
            merged.push(item);
          }
        });

        return merged;
      });

      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      setLoadMoreError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openCreateForm = () => {
    setFormValues(initialFormState);
    setFormErrors({});
    setFormApiError(null);
    setFormNameDirty(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setFormOpen(false);
    setFormApiError(null);
    setFormErrors({});
    setFormNameDirty(false);
  };

  const handleFormChange = (name, value) => {
    setFormErrors((previous) => ({ ...previous, [name]: undefined }));

    setFormValues((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "billing_month" && value) {
        const [year, month] = value.split("-");
        if (year && month) {
          const invoiceDate = new Date(Number(year), Number(month) - 1, 1);
          next.invoice_date = formatDateInput(invoiceDate);
          next.due_date = formatDateInput(addDays(invoiceDate, 5));
        }
      }

      if (name === "invoice_date" && value) {
        const invoiceDate = new Date(value);
        if (!Number.isNaN(invoiceDate.getTime())) {
          next.billing_month = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;
        }
      }

      if (name === "tenant_unit_id") {
        const unitId = Number(value);
        const unit = tenantUnitMap.get(unitId);

        if (unit) {
          if (!formNameDirty) {
            next.invoice_number = buildSuggestedInvoiceNumber(unit);
          }

          if (!previous.rent_amount || previous.rent_amount === "") {
            const rent = toAmount(unit?.monthly_rent ?? 0);
            next.rent_amount = rent > 0 ? rent.toFixed(2) : "";
          }
        }
      }

      if (name === "invoice_number") {
        setFormNameDirty(true);
      }

      return next;
    });
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
        throw new Error("You must be logged in before generating an invoice.");
      }

      const payload = buildInvoicePayload(formValues);

      const response = await fetch(`${API_BASE_URL}/rent-invoices`, {
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
        setFormErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to create invoice (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const invoice = result?.data ?? result;

      setInvoices((previous) => [invoice, ...previous]);
      setFlashMessage("Rent invoice generated successfully.");
      setFormOpen(false);
      setFormValues(initialFormState);
      setFormNameDirty(false);
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleBulkFormSubmit = async (event) => {
    event.preventDefault();

    if (bulkFormSubmitting) {
      return;
    }

    setBulkFormSubmitting(true);
    setBulkFormErrors({});
    setBulkFormApiError(null);
    setBulkResult(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before generating bulk invoices.");
      }

      const payload = {
        invoice_date: bulkFormValues.invoice_date || null,
        due_date: bulkFormValues.due_date || null,
        late_fee: bulkFormValues.late_fee ? Number(bulkFormValues.late_fee) : 0,
        status: bulkFormValues.status || "generated",
        skip_existing: bulkFormValues.skip_existing ?? true,
      };

      const response = await fetch(`${API_BASE_URL}/rent-invoices/bulk-generate`, {
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
        setBulkFormErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation failed.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to create bulk invoices (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      setBulkResult(result);

      // Refresh invoices list
      setRefreshKey((value) => value + 1);
      setFlashMessage(
        `Bulk generation completed: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed.`
      );
    } catch (err) {
      setBulkFormApiError(err.message);
    } finally {
      setBulkFormSubmitting(false);
    }
  };

  const handleViewInvoice = async (invoice) => {
    if (!invoice?.id) return;

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewInvoice(invoice);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before viewing an invoice.");
      }

      const response = await fetch(
        `${API_BASE_URL}/rent-invoices/${invoice.id}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to load invoice details (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const fullInvoice = result?.data ?? result;

      setPreviewInvoice(fullInvoice);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleMarkAsSent = async (invoiceId) => {
    await updateInvoice(invoiceId, {
      status: "sent",
    });
  };

  const handleMarkAsPaid = async (invoiceId) => {
    const today = formatDateInput(new Date());
    await updateInvoice(invoiceId, {
      status: "paid",
      paid_date: today,
    });
  };

  const updateInvoice = async (invoiceId, payload) => {
    if (!invoiceId || updatingInvoiceId) {
      return;
    }

    setUpdatingInvoiceId(invoiceId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before updating an invoice.");
      }

      const response = await fetch(
        `${API_BASE_URL}/rent-invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 422) {
        const validationPayload = await response.json();
        throw new Error(
          validationPayload?.message ?? "Validation failed for the update.",
        );
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to update invoice (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const invoice = result?.data ?? result;

      setInvoices((previous) =>
        previous.map((item) => (item.id === invoice.id ? invoice : item)),
      );
      setFlashMessage("Invoice updated.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!invoiceId || deletingInvoiceId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this invoice? This action cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setDeletingInvoiceId(invoiceId);
    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before deleting an invoice.");
      }

      const response = await fetch(`${API_BASE_URL}/rent-invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 204) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to delete invoice (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setInvoices((previous) => previous.filter((item) => item.id !== invoiceId));
      setFlashMessage("Invoice deleted. You can now create a new one.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewInvoice(null);
    setPreviewError(null);
  };

  const handlePrintPreview = () => {
    if (!previewRef.current || !previewInvoice) return;

    const printContents = previewRef.current.innerHTML;
    const invoiceNumber = previewInvoice?.invoice_number ?? "rent-invoice";
    const printWindow = window.open("", "_blank", "width=900,height=650");

    if (!printWindow) {
      setFlashMessage("Unable to open print window. Check your browser settings.");
      return;
    }

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${invoiceNumber}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 32px; color: #0f172a; }
      h1, h2, h3 { margin: 0; }
      .invoice-preview { max-width: 720px; margin: 0 auto; }
      .invoice-section { margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
      th { background-color: #f8fafc; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; color: #64748b; }
      .totals-row td { font-weight: 600; }
    </style>
  </head>
  <body>
    ${printContents}
  </body>
</html>`);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 150);
  };

  const handleExportPdf = async () => {
    if (!previewRef.current || !previewInvoice) {
      return;
    }

    if (typeof window === "undefined") {
      setFlashMessage("PDF export is only available in the browser.");
      return;
    }

    try {
      setExportingPdf(true);

      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before exporting an invoice.");
      }

      const filename = `${(previewInvoice?.invoice_number ?? "rent-invoice")
        .toString()
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`;

      const response = await fetch(
        `${API_BASE_URL}/rent-invoices/${previewInvoice.id}/export`,
        {
          method: "GET",
          headers: {
            Accept: "application/pdf",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const contentType = response.headers.get("Content-Type") ?? "";

        if (contentType.includes("application/json")) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.message ??
              `Unable to export invoice (HTTP ${response.status}).`,
          );
        }

        throw new Error(
          `Unable to export invoice (HTTP ${response.status}).`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The PDF export returned an empty file.");
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      anchor.addEventListener("click", () => {
        requestAnimationFrame(() => {
          window.URL.revokeObjectURL(downloadUrl);
        });
      });

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setFlashMessage("Invoice exported as PDF.");
    } catch (err) {
      setFlashMessage(err?.message ?? "Unable to export invoice as PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const tenantUnitOptions = useMemo(() => {
    return tenantUnits
      .map((unit) => {
        const tenantName = unit?.tenant?.full_name ?? `Tenant #${unit?.tenant_id}`;
        const unitNumber =
          unit?.unit?.unit_number ??
          (unit?.unit?.id ? `Unit #${unit.unit.id}` : `Unit #${unit?.unit_id}`);

        return {
          value: String(unit.id),
          label: `${tenantName} · ${unitNumber}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenantUnits]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Rent billing workflow
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Receipt size={24} className="text-primary" />
            Rent invoices
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Generate monthly rent invoices, monitor outstanding balances, and
            mark collections as they arrive. Data syncs with the accounting API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setBulkFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <FileText size={16} />
            Bulk generate
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Generate invoice
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Invoices generated"
          value={stats.total}
          icon={FileText}
        />
        <SummaryCard
          title="Outstanding balance"
          value={formatCurrency(stats.outstanding)}
          icon={CircleDollarSign}
          tone="warning"
        />
        <SummaryCard
          title="Collected this period"
          value={formatCurrency(stats.collected)}
          icon={TrendingUp}
          tone="success"
        />
        <SummaryCard
          title="Overdue invoices"
          value={stats.overdue}
          icon={AlertTriangle}
          tone="danger"
        />
      </section>

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
              placeholder="Search by invoice number, tenant, or unit…"
              suppressHydrationWarning
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusFilters.map((option) => (
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

        {tenantUnitsError ? (
          <p className="mt-3 text-xs text-red-500">
            {tenantUnitsError} — tenant options may be limited.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-700">
            {flashMessage}
          </div>
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : filteredInvoices.length === 0 && !loading ? (
          <EmptyState hasFilters={Boolean(search.trim()) || statusFilter !== "all"} onCreate={openCreateForm} />
        ) : (
          <>
            <DataDisplay
              data={filteredInvoices}
              loading={loading}
              loadingMessage="Loading rent invoices…"
              emptyMessage={
                Boolean(search.trim()) || statusFilter !== "all"
                  ? "No invoices match your filters"
                  : "No rent invoices yet"
              }
              columns={[
                {
                  key: "invoice_number",
                  label: "Invoice",
                  render: (value, item) => (
                    <div>
                      <div className="font-semibold text-slate-900">
                        {value ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Created {formatDisplayDate(item?.created_at ?? item?.invoice_date)}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "tenant_unit",
                  label: "Tenant / Unit",
                  render: (_, item) => {
                    const tenantUnit =
                      item?.tenant_unit ??
                      (item?.tenant_unit_id ? tenantUnitMap.get(item.tenant_unit_id) : null);
                    const tenantName =
                      tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
                    const unitLabel =
                      tenantUnit?.unit?.unit_number ??
                      (tenantUnit?.unit?.id
                        ? `Unit #${tenantUnit.unit.id}`
                        : tenantUnit?.unit_id
                        ? `Unit #${tenantUnit.unit_id}`
                        : "Unassigned");
                    return (
                      <div>
                        <div className="font-semibold text-slate-900">{tenantName}</div>
                        <div className="text-xs text-slate-500">{unitLabel}</div>
                      </div>
                    );
                  },
                },
                {
                  key: "invoice_date",
                  label: "Invoice Date",
                  render: (value) => formatDisplayDate(value),
                },
                {
                  key: "due_date",
                  label: "Due Date",
                  render: (value) => formatDisplayDate(value),
                },
                {
                  key: "amount",
                  label: "Amount",
                  render: (_, item) => {
                    const amount = toAmount(item?.rent_amount) + toAmount(item?.late_fee ?? 0);
                    return <span className="font-semibold text-slate-900">{formatCurrency(amount)}</span>;
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <StatusBadge status={value ?? "generated"} />,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => {
                    const status = item?.status ?? "generated";
                    const isGenerated = status === "generated";
                    const isSent = status === "sent";
                    const isPaid = status === "paid";
                    const isOverdue = status === "overdue";
                    const updating = updatingInvoiceId === item.id;
                    const deleting = deletingInvoiceId === item.id;
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoice(item);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {isGenerated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInvoice(item.id);
                            }}
                            disabled={deleting}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                          >
                            {deleting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        )}
                        {(isGenerated || isOverdue) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsSent(item.id);
                            }}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {updating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            Mark sent
                          </button>
                        )}
                        {(isGenerated || isSent || isOverdue) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaid(item.id);
                            }}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {updating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Mark paid
                          </button>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={14} />
                            Paid
                          </span>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              renderCard={(invoice) => (
                <InvoiceCard
                  invoice={invoice}
                  tenantUnitMap={tenantUnitMap}
                  onView={() => handleViewInvoice(invoice)}
                  onMarkSent={() => handleMarkAsSent(invoice.id)}
                  onMarkPaid={() => handleMarkAsPaid(invoice.id)}
                  updating={updatingInvoiceId === invoice.id}
                  onDelete={() => handleDeleteInvoice(invoice.id)}
                  deleting={deletingInvoiceId === invoice.id}
                />
              )}
              onRowClick={(invoice) => {
                handleViewInvoice(invoice);
              }}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>{filteredInvoices.length} invoices shown</p>

              {pagination.nextUrl ? (
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  {loadMoreError ? (
                    <p className="text-xs text-red-500 sm:order-2 sm:pl-3">
                      {loadMoreError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <RefreshCcw size={16} />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </section>

      {previewOpen ? (
        <InvoicePreviewDialog
          invoice={previewInvoice}
          loading={previewLoading}
          exporting={exportingPdf}
          error={previewError}
          onClose={closePreview}
          onPrint={handlePrintPreview}
          onExport={handleExportPdf}
          previewRef={previewRef}
          tenantUnitMap={tenantUnitMap}
          paymentMethodLabels={paymentMethodLabels}
        />
      ) : null}

      {formOpen ? (
        <InvoiceFormDialog
          values={formValues}
          errors={formErrors}
          submitting={formSubmitting}
          apiError={formApiError}
          onClose={closeForm}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          tenantUnitOptions={tenantUnitOptions}
          tenantUnitsLoading={tenantUnitsLoading}
          tenantUnitMap={tenantUnitMap}
        />
      ) : null}

      {bulkFormOpen ? (
        <BulkInvoiceFormDialog
          values={bulkFormValues}
          errors={bulkFormErrors}
          submitting={bulkFormSubmitting}
          apiError={bulkFormApiError}
          result={bulkResult}
          onClose={() => {
            setBulkFormOpen(false);
            setBulkFormApiError(null);
            setBulkFormErrors({});
            setBulkResult(null);
          }}
          onChange={(name, value) => {
            setBulkFormErrors((prev) => ({ ...prev, [name]: undefined }));
            setBulkFormValues((prev) => ({ ...prev, [name]: value }));
          }}
          onSubmit={handleBulkFormSubmit}
        />
      ) : null}
    </div>
  );
}

function InvoiceRow({
  invoice,
  tenantUnitMap,
  onView,
  onMarkSent,
  onMarkPaid,
  onDelete,
  updating,
  deleting,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");

  const amount =
    toAmount(invoice?.rent_amount) + toAmount(invoice?.late_fee ?? 0);

  const status = invoice?.status ?? "generated";
  const isGenerated = status === "generated";
  const isSent = status === "sent";
  const isPaid = status === "paid";
  const isOverdue = status === "overdue";

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">
            {invoice?.invoice_number ?? "—"}
          </span>
          <span className="text-xs text-slate-500">
            Created {formatDisplayDate(invoice?.created_at ?? invoice?.invoice_date)}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">
            {tenantName}
          </span>
          <span className="text-xs text-slate-500">{unitLabel}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-slate-600">
        {formatDisplayDate(invoice?.invoice_date)}
      </td>
      <td className="px-3 py-3 text-sm text-slate-600">
        {formatDisplayDate(invoice?.due_date)}
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
        {formatCurrency(amount)}
      </td>
      <td className="px-3 py-3">
        <StatusBadge
          status={status}
          isAdvanceCovered={invoice?.is_advance_covered ?? false}
          advanceRentApplied={invoice?.advance_rent_applied ?? 0}
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
      >
        <Eye size={14} />
        View
      </button>
          {(isGenerated || isOverdue) && (
            <button
              type="button"
              onClick={onMarkSent}
              disabled={updating}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Mark sent
            </button>
          )}
          {(isGenerated || isSent || isOverdue) && (
            <button
              type="button"
              onClick={onMarkPaid}
              disabled={updating}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Mark paid
            </button>
          )}
          {isPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 size={14} />
              Paid
            </span>
          ) : null}
          {isGenerated ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
            >
              {deleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function InvoiceCard({
  invoice,
  tenantUnitMap,
  onView,
  onMarkSent,
  onMarkPaid,
  onDelete,
  updating,
  deleting,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");

  const amount = toAmount(invoice?.rent_amount) + toAmount(invoice?.late_fee ?? 0);
  const status = invoice?.status ?? "generated";
  const isGenerated = status === "generated";
  const isSent = status === "sent";
  const isPaid = status === "paid";
  const isOverdue = status === "overdue";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Invoice
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {invoice?.invoice_number ?? "—"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDisplayDate(invoice?.created_at ?? invoice?.invoice_date)}
          </p>
        </div>
        <StatusBadge
          status={status}
          isAdvanceCovered={invoice?.is_advance_covered ?? false}
          advanceRentApplied={invoice?.advance_rent_applied ?? 0}
        />
      </div>

      <dl className="grid gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Tenant / Unit</dt>
          <dd className="mt-1 font-semibold text-slate-900">{tenantName}</dd>
          <dd className="text-xs text-slate-500">{unitLabel}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Invoice Date</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatDisplayDate(invoice?.invoice_date)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Due Date</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatDisplayDate(invoice?.due_date)}
            </dd>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Amount</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(amount)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
        >
          <Eye size={14} />
          View
        </button>
        {(isGenerated || isOverdue) && (
          <button
            type="button"
            onClick={onMarkSent}
            disabled={updating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {updating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Mark sent
          </button>
        )}
        {(isGenerated || isSent || isOverdue) && (
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={updating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Mark paid
          </button>
        )}
        {isPaid && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 size={14} />
            Paid
          </span>
        )}
        {isGenerated && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function InvoiceFormDialog({
  values,
  errors,
  submitting,
  apiError,
  onClose,
  onChange,
  onSubmit,
  tenantUnitOptions,
  tenantUnitsLoading,
  tenantUnitMap,
}) {
  const selectedTenantUnit = useMemo(() => {
    if (!values.tenant_unit_id) {
      return null;
    }
    return tenantUnitMap?.get(Number(values.tenant_unit_id)) ?? null;
  }, [values.tenant_unit_id, tenantUnitMap]);

  const advanceRentInfo = useMemo(() => {
    if (!selectedTenantUnit || !values.invoice_date) {
      return null;
    }

    const invoiceDate = new Date(values.invoice_date);
    if (Number.isNaN(invoiceDate.getTime())) {
      return null;
    }

    const leaseStart = selectedTenantUnit.lease_start
      ? new Date(selectedTenantUnit.lease_start)
      : null;
    if (!leaseStart || Number.isNaN(leaseStart.getTime())) {
      return null;
    }

    const advanceMonths = selectedTenantUnit.advance_rent_months ?? 0;
    if (advanceMonths <= 0) {
      return null;
    }

    const coverageEnd = new Date(leaseStart);
    coverageEnd.setMonth(coverageEnd.getMonth() + advanceMonths);

    const isCovered = invoiceDate >= leaseStart && invoiceDate <= coverageEnd;
    const remaining = selectedTenantUnit.advance_rent_remaining ?? 0;
    const invoiceAmount = Number(values.rent_amount ?? 0) + Number(values.late_fee ?? 0);

    return {
      isCovered,
      remaining,
      invoiceAmount,
      canFullyCover: isCovered && remaining >= invoiceAmount,
      canPartiallyCover: isCovered && remaining > 0 && remaining < invoiceAmount,
    };
  }, [selectedTenantUnit, values.invoice_date, values.rent_amount, values.late_fee]);

  const billingMonthValue = useMemo(() => {
    if (values.billing_month) {
      return values.billing_month;
    }

    if (values.invoice_date) {
      const parsed = new Date(values.invoice_date);
      if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      }
    }

    return "";
  }, [values.billing_month, values.invoice_date]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Generate rent invoice
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Create monthly invoice
          </h2>
          <p className="text-sm text-slate-600">
            Select the tenant unit, confirm billing dates, and send the invoice to
            your accounting system.
          </p>
        </div>

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {tenantUnitsLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Loading tenant units…
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Tenant unit"
            htmlFor="tenant_unit_id"
            required
            error={errors?.tenant_unit_id}
          >
            <select
              id="tenant_unit_id"
              name="tenant_unit_id"
              value={values.tenant_unit_id}
              onChange={(event) => onChange("tenant_unit_id", event.target.value)}
              required
              disabled={submitting || tenantUnitsLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="" disabled>
                Select tenant unit
              </option>
              {tenantUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          {advanceRentInfo && advanceRentInfo.isCovered ? (
            <div
              className={`rounded-xl border p-4 ${
                advanceRentInfo.canFullyCover
                  ? "border-blue-200 bg-blue-50/80"
                  : advanceRentInfo.canPartiallyCover
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className={`mt-0.5 flex-shrink-0 ${
                    advanceRentInfo.canFullyCover
                      ? "text-blue-600"
                      : "text-amber-600"
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      advanceRentInfo.canFullyCover
                        ? "text-blue-900"
                        : "text-amber-900"
                    }`}
                  >
                    {advanceRentInfo.canFullyCover
                      ? "✓ This invoice will be automatically paid with advance rent"
                      : advanceRentInfo.canPartiallyCover
                        ? "⚠ Partial advance rent will be applied"
                        : "ℹ Invoice date is within advance rent period"}
                  </p>
                  {advanceRentInfo.remaining > 0 ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {advanceRentInfo.canFullyCover ? (
                        <>Advance rent available: {formatCurrency(advanceRentInfo.remaining)}</>
                      ) : (
                        <>
                          {formatCurrency(advanceRentInfo.remaining)} available. Invoice amount:{" "}
                          {formatCurrency(advanceRentInfo.invoiceAmount)}. Remaining due:{" "}
                          {formatCurrency(
                            advanceRentInfo.invoiceAmount - advanceRentInfo.remaining
                          )}
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">
                      No advance rent remaining. Invoice will be generated normally.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : selectedTenantUnit &&
            selectedTenantUnit.advance_rent_amount > 0 &&
            selectedTenantUnit.advance_rent_remaining > 0 &&
            values.invoice_date ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start gap-3">
                <CalendarRange size={18} className="mt-0.5 flex-shrink-0 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Advance rent available but invoice date outside coverage period
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    This lease has {formatCurrency(selectedTenantUnit.advance_rent_remaining)}{" "}
                    advance rent remaining, but the invoice date falls outside the advance rent
                    coverage period (months 1-{selectedTenantUnit.advance_rent_months}).
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Invoice number"
              htmlFor="invoice_number"
              hint="Leave empty to auto-generate (e.g., RINV-202401-001)"
              error={errors?.invoice_number}
            >
              <input
                id="invoice_number"
                name="invoice_number"
                value={values.invoice_number}
                onChange={(event) => onChange("invoice_number", event.target.value)}
                placeholder="Auto-generated if left empty"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Billing month"
              htmlFor="billing_month"
              required
              hint="Sets invoice date to the 1st and due date 5 days later"
              error={errors?.billing_month}
            >
              <input
                id="billing_month"
                name="billing_month"
                type="month"
                value={billingMonthValue}
                onChange={(event) => onChange("billing_month", event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Invoice date"
              htmlFor="invoice_date"
              required
              error={errors?.invoice_date}
            >
              <input
                id="invoice_date"
                name="invoice_date"
                type="date"
                value={values.invoice_date}
                onChange={(event) => onChange("invoice_date", event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Due date"
              htmlFor="due_date"
              required
              error={errors?.due_date}
            >
              <input
                id="due_date"
                name="due_date"
                type="date"
                value={values.due_date}
                onChange={(event) => onChange("due_date", event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Rent amount (MVR)"
              htmlFor="rent_amount"
              required
              error={errors?.rent_amount}
            >
              <input
                id="rent_amount"
                name="rent_amount"
                type="number"
                step="0.01"
                min="0"
                value={values.rent_amount}
                onChange={(event) => onChange("rent_amount", event.target.value)}
                placeholder="8500.00"
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Late fee (MVR)"
              htmlFor="late_fee"
              error={errors?.late_fee}
            >
              <input
                id="late_fee"
                name="late_fee"
                type="number"
                step="0.01"
                min="0"
                value={values.late_fee}
                onChange={(event) => onChange("late_fee", event.target.value)}
                placeholder="0.00"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes" hint="Add notes through your accounting system after generating the invoice.">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
              Optional notes and attachments can be added in the accounting portal after this invoice is generated.
            </div>
          </FormField>

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
                  Generating…
                </>
              ) : (
                <>
                  <Receipt size={16} />
                  Generate invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoicePreviewDialog({
  invoice,
  loading,
  exporting,
  error,
  onClose,
  onPrint,
  onExport,
  previewRef,
  tenantUnitMap,
  paymentMethodLabels,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitNumber =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "—");
  const propertyName = tenantUnit?.unit?.property?.name ?? "";
  const rentAmount = toAmount(invoice?.rent_amount);
  const lateFee = toAmount(invoice?.late_fee);
  const totalDue = rentAmount + lateFee;
  const billingLabel = formatMonthYear(invoice?.invoice_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Invoice preview
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {invoice?.invoice_number ?? "Rent invoice"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              disabled={loading || exporting || !invoice}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={loading || exporting || !invoice}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm font-medium">Preparing invoice…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <div
            ref={previewRef}
            className="invoice-preview space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-inner"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  RentApplicaiton
                </p>
                <h3 className="text-xl font-semibold text-slate-900">
                  Rental Management Suite
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Maldives portfolio · Rent billing department
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice number
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {invoice?.invoice_number ?? "—"}
                </p>
                <div className="mt-2 inline-flex">
                  <StatusBadge
                    status={invoice?.status ?? "generated"}
                    isAdvanceCovered={invoice?.is_advance_covered ?? false}
                    advanceRentApplied={invoice?.advance_rent_applied ?? 0}
                  />
                </div>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bill to
                </h4>
                <p className="text-sm font-semibold text-slate-900">{tenantName}</p>
                <p className="text-xs text-slate-600">Unit {unitNumber}</p>
                {propertyName ? (
                  <p className="text-xs text-slate-500">{propertyName}</p>
                ) : null}
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Invoice date
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatDisplayDate(invoice?.invoice_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Due date
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    <CalendarClock size={14} />
                    {formatDisplayDate(invoice?.due_date)}
                  </span>
                </div>
                {invoice?.payment_method ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Payment method
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatPaymentMethod(invoice.payment_method, paymentMethodLabels)}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <table className="w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Description
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold text-right">
                      Amount (MVR)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-3">
                      Monthly rent {billingLabel ? `· ${billingLabel}` : ""}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(rentAmount)}
                    </td>
                  </tr>
                  {lateFee > 0 ? (
                    <tr>
                      <td className="px-3 py-3">Late fee</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(lateFee)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="totals-row">
                    <td className="px-3 py-3 text-right text-xs uppercase tracking-wide text-slate-500">
                      Total due
                    </td>
                    <td className="px-3 py-3 text-right text-lg font-semibold text-slate-900">
                      {formatCurrency(totalDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-800">
                Payment instructions
              </p>
              <p className="mt-1">
                Please remit payment to the landlord treasury account. Include the
                invoice number in the reference for automated reconciliation.
              </p>
              {invoice?.status === "overdue" ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                  <AlertTriangle size={14} />
                  This invoice is overdue. Late fees continue to accrue.
                </p>
              ) : null}
            </section>

            <footer className="border-t border-dashed border-slate-200 pt-4 text-xs text-slate-400">
              Generated by RentApplicaiton · {formatDisplayDate(invoice?.created_at ?? new Date())}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, tone = "default" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${summaryTone(
        tone,
      )}`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-white/70 p-2 text-primary shadow-sm">
          <Icon size={18} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status, isAdvanceCovered = false, advanceRentApplied = 0 }) {
  const config = {
    generated: {
      label: "Generated",
      className: "bg-primary/10 text-primary",
    },
    sent: {
      label: "Sent",
      className: "bg-sky-100 text-sky-700",
    },
    paid: {
      label: isAdvanceCovered ? "Paid (Advance)" : "Paid",
      className: isAdvanceCovered 
        ? "bg-blue-100 text-blue-700" 
        : "bg-emerald-100 text-emerald-600",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-100 text-red-600",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-slate-200 text-slate-700",
    },
  };

  const tone = config[status] ?? config.generated;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
      >
        {tone.label}
      </span>
      {advanceRentApplied > 0 && (
        <span className="text-[10px] text-blue-600 font-medium">
          {isAdvanceCovered ? "✓ Fully paid with advance rent" : `+${formatCurrency(advanceRentApplied)} applied`}
        </span>
      )}
    </div>
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
        <AlertTriangle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn't load rent invoices
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Ensure you're logged in and the API server is reachable at{" "}
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
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Receipt size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No invoices match your filters" : "No invoices yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear search to see more results."
            : "Generate your first invoice to start tracking rent collections."}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
      >
        <Plus size={16} />
        Generate invoice
      </button>
    </div>
  );
}

function FormField({ label, htmlFor, children, error, required, hint }) {
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
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      {error ? <FieldError>{firstError(error)}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }) {
  return <p className="text-xs font-medium text-red-500">{children}</p>;
}

function formatDateInput(date) {
  if (!date) return "";
  const instance = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instance.getTime())) {
    return "";
  }

  const year = instance.getFullYear();
  const month = String(instance.getMonth() + 1).padStart(2, "0");
  const day = String(instance.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const instance = date instanceof Date ? new Date(date) : new Date();
  instance.setDate(instance.getDate() + days);
  return instance;
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

function toAmount(value) {
  if (value === undefined || value === null) {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

import { formatMVR as formatCurrency } from "@/lib/currency";

function formatPaymentMethod(method, labelMap) {
  if (!method) {
    return "—";
  }

  if (labelMap && typeof labelMap.get === "function" && labelMap.has(method)) {
    return labelMap.get(method);
  }

  const fallback = formatPaymentMethodLabel(method);
  return fallback || method;
}

function buildInvoicePayload(values) {
  return {
    tenant_unit_id: values.tenant_unit_id ? Number(values.tenant_unit_id) : null,
    invoice_number: (values.invoice_number ?? "").trim(),
    invoice_date: values.invoice_date || null,
    due_date: values.due_date || null,
    rent_amount: values.rent_amount ? Number(values.rent_amount) : null,
    late_fee: values.late_fee ? Number(values.late_fee) : 0,
    status: values.status ?? "generated",
    paid_date: values.paid_date || null,
  };
}

function buildSuggestedInvoiceNumber(tenantUnit) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const unitNumber =
    tenantUnit?.unit?.unit_number ??
    tenantUnit?.unit_id ??
    tenantUnit?.id ??
    "UNIT";
  return `${year}${month}-${String(unitNumber).toUpperCase()}`;
}

function firstError(error) {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
}

function summaryTone(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}

function BulkInvoiceFormDialog({
  values,
  errors,
  submitting,
  apiError,
  result,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Bulk invoice generation
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Generate invoices for all tenants
          </h2>
          <p className="text-sm text-slate-600">
            Create rent invoices for all active tenant units with the same billing details.
            Each invoice will use the tenant unit's monthly rent amount.
          </p>
        </div>

        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {result ? (
          <div className="mb-4 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {result.message}
              </p>
            </div>

            {result.created > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created: {result.created} invoices
                </p>
              </div>
            )}

            {result.skipped > 0 && result.skipped_details?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                  Skipped: {result.skipped} invoices
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.skipped_details.map((item, idx) => (
                    <p key={idx} className="text-xs text-amber-700">
                      {item.tenant_name} ({item.unit_number}): {item.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.failed > 0 && result.failed_details?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">
                  Failed: {result.failed} invoices
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.failed_details.map((item, idx) => (
                    <p key={idx} className="text-xs text-red-700">
                      {item.tenant_name} ({item.unit_number}): {item.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Billing month"
            htmlFor="bulk_billing_month"
            required
            hint="Select the month and year for which you're generating rent invoices"
            error={errors?.billing_month || errors?.invoice_date}
          >
            <input
              id="bulk_billing_month"
              name="billing_month"
              type="month"
              value={values.billing_month}
              onChange={(event) => {
                const monthValue = event.target.value;
                if (monthValue) {
                  const [year, month] = monthValue.split("-");
                  const invoiceDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                  const dueDate = addDays(new Date(invoiceDate), 5);
                  onChange("billing_month", monthValue);
                  onChange("invoice_date", formatDateInput(invoiceDate));
                  onChange("due_date", formatDateInput(dueDate));
                }
              }}
              required
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Invoice date"
              htmlFor="bulk_invoice_date"
              required
              hint="Automatically set to the 1st of the selected month"
              error={errors?.invoice_date}
            >
              <input
                id="bulk_invoice_date"
                name="invoice_date"
                type="date"
                value={values.invoice_date}
                onChange={(event) => onChange("invoice_date", event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Due date"
              htmlFor="bulk_due_date"
              required
              hint="Automatically set to 5 days after invoice date"
              error={errors?.due_date}
            >
              <input
                id="bulk_due_date"
                name="due_date"
                type="date"
                value={values.due_date}
                onChange={(event) => onChange("due_date", event.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Late fee (MVR)"
              htmlFor="bulk_late_fee"
              hint="Applied to all invoices (optional)"
              error={errors?.late_fee}
            >
              <input
                id="bulk_late_fee"
                name="late_fee"
                type="number"
                step="0.01"
                min="0"
                value={values.late_fee}
                onChange={(event) => onChange("late_fee", event.target.value)}
                placeholder="0.00"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Status"
              htmlFor="bulk_status"
              hint="Default status for all generated invoices"
              error={errors?.status}
            >
              <select
                id="bulk_status"
                name="status"
                value={values.status}
                onChange={(event) => onChange("status", event.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>

          <FormField
            label="Options"
            htmlFor="bulk_skip_existing"
            hint="Skip tenant units that already have an invoice for the selected invoice date"
          >
            <label className="flex items-center gap-2">
              <input
                id="bulk_skip_existing"
                name="skip_existing"
                type="checkbox"
                checked={values.skip_existing}
                onChange={(event) => onChange("skip_existing", event.target.checked)}
                disabled={submitting}
                className="rounded border-slate-300 text-primary focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="text-sm text-slate-700">
                Skip existing invoices for this date
              </span>
            </label>
          </FormField>

          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
            <div className="flex items-start gap-3">
              <FileText size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  How it works
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  This will generate invoices for all active tenant units. Each invoice will use
                  the tenant unit's monthly rent amount. Advance rent will be automatically
                  applied if applicable.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Generate for all tenants
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


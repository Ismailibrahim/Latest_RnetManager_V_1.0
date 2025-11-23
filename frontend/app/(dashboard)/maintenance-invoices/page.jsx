"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardPlus,
  Download,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const initialFormState = {
  tenant_unit_id: "",
  maintenance_request_id: "",
  invoice_number: "",
  invoice_date: "",
  due_date: "",
  cost: "0.00",
  tax_amount: "0.00",
  discount_amount: "0.00",
  grand_total: "0.00",
  include_tax: true,
  line_items: [],
  notes: "",
  status: "draft",
  paid_date: "",
};

const emptyLineItem = {
  description: "",
  quantity: "1",
  unit_cost: "0.00",
  total: "0.00",
};

export default function MaintenanceInvoicesPage() {
  const pathname = usePathname();
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
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  
  // Tenant unit selection dialog state
  const [tenantUnitSelectionOpen, setTenantUnitSelectionOpen] = useState(false);
  const [pendingMaintenanceRequest, setPendingMaintenanceRequest] = useState(null);
  const [availableTenantUnits, setAvailableTenantUnits] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formApiError, setFormApiError] = useState(null);

  const [flashMessage, setFlashMessage] = useState(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const previewRef = useRef(null);

  const {
    settings: systemSettings,
    loading: systemSettingsLoading,
  } = useSystemSettings();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchInvoices() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in so we can load maintenance invoices.");
        }

        const url = new URL(`${API_BASE_URL}/maintenance-invoices`);
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
            `Unable to load maintenance invoices (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        setInvoices(Array.isArray(payload?.data) ? payload.data : []);
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

  // Force refresh when navigating to this page (more aggressive approach)
  useEffect(() => {
    if (pathname === '/maintenance-invoices') {
      // Always refresh when navigating to this page (with a small delay to avoid duplicate calls)
      const timeoutId = setTimeout(() => {
        console.log('[Maintenance Invoices] Pathname changed to maintenance-invoices, refreshing...');
        setRefreshKey((prev) => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);

  // Auto-refresh mechanism to ensure invoice status updates are reflected
  // Listens for payment creation events via localStorage and refreshes when navigating back
  useEffect(() => {
    const checkForPaymentUpdate = () => {
      if (pathname !== '/maintenance-invoices') {
        return;
      }
      
      const paymentFlag = localStorage.getItem('maintenance_invoice_payment_created');
      if (paymentFlag) {
        const paymentTime = parseInt(paymentFlag, 10);
        const now = Date.now();
        // Only refresh if payment was created in the last 30 seconds
        if (now - paymentTime < 30000) {
          console.log('[Maintenance Invoices] Payment detected, refreshing in 1.5s...', {
            paymentTime,
            now,
            age: now - paymentTime,
          });
          // Clear the flag
          localStorage.removeItem('maintenance_invoice_payment_created');
          // Delay to ensure backend has finished updating status
          setTimeout(() => {
            console.log('[Maintenance Invoices] Refreshing invoice list...');
            setRefreshKey((prev) => prev + 1);
          }, 1500);
        } else {
          // Flag is too old, clear it
          localStorage.removeItem('maintenance_invoice_payment_created');
        }
      }
    };
    
    // Check immediately when component mounts or pathname changes to this page
    checkForPaymentUpdate();
    
    // Also listen for storage events (when payment is created in another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === 'maintenance_invoice_payment_created') {
        checkForPaymentUpdate();
      }
    };
    
    // Also refresh when page becomes visible (navigating back from payment collection)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForPaymentUpdate();
      }
    };
    
    // Also check on window focus (when switching back to tab)
    const handleFocus = () => {
      checkForPaymentUpdate();
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in so we can load tenant and maintenance data.");
        }

        const [unitsResponse, requestsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/tenant-units?per_page=200&status=active`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/maintenance-requests?per_page=200`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!unitsResponse.ok) {
          const payload = await unitsResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load tenant units (HTTP ${unitsResponse.status}).`;
          throw new Error(message);
        }

        if (!requestsResponse.ok) {
          const payload = await requestsResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load maintenance requests (HTTP ${requestsResponse.status}).`;
          throw new Error(message);
        }

        const unitsPayload = await unitsResponse.json();
        const requestsPayload = await requestsResponse.json();
        if (!isMounted) return;

        const tenantUnitsData = Array.isArray(unitsPayload?.data) ? unitsPayload.data : [];
        const maintenanceRequestsData = Array.isArray(requestsPayload?.data) ? requestsPayload.data : [];

        // Debug logging (remove in production if needed)
        if (tenantUnitsData.length === 0) {
          console.warn('No tenant units found. Response:', unitsPayload);
          console.warn('Request URL:', `${API_BASE_URL}/tenant-units?per_page=200&status=active`);
        } else {
          // Log first tenant unit to verify structure
          console.log('Sample tenant unit data:', tenantUnitsData[0]);
        }

        setTenantUnits(tenantUnitsData);
        setMaintenanceRequests(maintenanceRequestsData);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (!isMounted) return;
        setOptionsError(err.message);
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    }

    fetchOptions();

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

  // Handle URL parameters to pre-fill form from "Create Invoice" button
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const maintenanceRequestId = params.get("maintenance_request_id");
    const unitId = params.get("unit_id");

    if (maintenanceRequestId && maintenanceRequests.length > 0 && tenantUnits.length > 0) {
      const request = maintenanceRequests.find((r) => String(r.id) === maintenanceRequestId);
      
      if (request) {
        // Find tenant unit for this unit
        const unitIdToFind = unitId ? Number(unitId) : request.unit_id;
        const tenantUnit = tenantUnits.find(
          (tu) => tu.unit_id === unitIdToFind && tu.status === "active"
        );

        if (tenantUnit) {
          // Pre-fill form with maintenance request data
          const today = new Date().toISOString().split("T")[0];
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // Default 30 days from today
          
          setFormValues({
            ...initialFormState,
            tenant_unit_id: String(tenantUnit.id),
            maintenance_request_id: String(request.id),
            invoice_date: today,
            due_date: dueDate.toISOString().split("T")[0],
            cost: String(request.cost ?? "0.00"),
            grand_total: String(request.cost ?? "0.00"),
            notes: request.description || "",
            status: "draft",
          });
          
          // Open the form
          setFormOpen(true);
          
          // Clear URL parameters
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          // Unit doesn't have an active tenant, show selection dialog
          setPendingMaintenanceRequest(request);
          setTenantUnitSelectionOpen(true);
          
          // Find all tenant units for this unit
          const availableUnits = tenantUnits.filter((tu) => tu.unit_id === unitIdToFind);
          setAvailableTenantUnits(availableUnits);
          
          // Clear URL parameters
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }
  }, [maintenanceRequests, tenantUnits]);

  const tenantUnitMap = useMemo(() => {
    return tenantUnits.reduce((acc, unit) => {
      if (unit?.id) {
        acc.set(unit.id, unit);
      }
      return acc;
    }, new Map());
  }, [tenantUnits]);

  const maintenanceRequestMap = useMemo(() => {
    return maintenanceRequests.reduce((acc, request) => {
      if (request?.id) {
        acc.set(request.id, request);
      }
      return acc;
    }, new Map());
  }, [maintenanceRequests]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const tenant =
        invoice?.tenant_unit?.tenant?.full_name ??
        tenantUnitMap.get(invoice?.tenant_unit_id)?.tenant?.full_name ??
        "";
      const unit =
        invoice?.tenant_unit?.unit?.unit_number ??
        tenantUnitMap.get(invoice?.tenant_unit_id)?.unit?.unit_number ??
        "";
      const requestSubject =
        invoice?.maintenance_request?.subject ??
        maintenanceRequestMap.get(invoice?.maintenance_request_id)?.subject ??
        "";

      return [
        invoice?.invoice_number,
        tenant,
        unit,
        requestSubject,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [invoices, search, tenantUnitMap, maintenanceRequestMap]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => {
        acc.total += 1;
        const total = toAmount(invoice?.grand_total);
        acc.totalBilled += total;

        if (invoice?.status === "paid") {
          acc.collected += total;
        } else if (!["cancelled", "draft"].includes(invoice?.status ?? "")) {
          acc.outstanding += total;
        }

        if (invoice?.status === "overdue") {
          acc.overdue += 1;
        }

        return acc;
      },
      { total: 0, totalBilled: 0, collected: 0, outstanding: 0, overdue: 0 },
    );
  }, [filteredInvoices]);

  const tenantUnitOptions = useMemo(() => {
    if (!Array.isArray(tenantUnits) || tenantUnits.length === 0) {
      return [];
    }

    return tenantUnits
      .map((unit) => {
        if (!unit || !unit.id) {
          return null;
        }

        const labelParts = [
          unit?.tenant?.full_name ?? `Tenant #${unit?.tenant_id ?? 'N/A'}`,
          unit?.unit?.unit_number ?? (unit?.unit?.id ? `Unit #${unit.unit.id}` : `Unit #${unit?.unit_id ?? 'N/A'}`),
        ].filter(Boolean);

        return { value: String(unit.id), label: labelParts.join(" · ") };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenantUnits]);

  const maintenanceRequestOptions = useMemo(() => {
    return maintenanceRequests
      .map((request) => ({
        value: String(request.id),
        label: request.subject ?? `Request #${request.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [maintenanceRequests]);

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
        throw new Error("Please log in so we can load more maintenance invoices.");
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
          `Unable to load more maintenance invoices (HTTP ${response.status}).`;
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
    const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
    const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
    const initialValues = {
      ...initialFormState,
      invoice_date: formatDateInput(new Date()),
      due_date: formatDateInput(addDays(new Date(), 7)),
      line_items: [{ ...emptyLineItem }],
      include_tax: gstEnabled, // Default to true if GST is enabled in settings
    };
    
    const totals = calculateTotals(initialValues, taxPercentage, gstEnabled && initialValues.include_tax);
    
    // Auto-calculate tax if enabled and include_tax is true
    if (gstEnabled && taxPercentage > 0 && initialValues.include_tax) {
      initialValues.tax_amount = totals.taxAmount;
    } else {
      initialValues.tax_amount = "0.00";
    }
    
    initialValues.grand_total = totals.grandTotal;
    
    setFormValues(initialValues);
    setFormErrors({});
    setFormApiError(null);
    setFormSubmitting(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setFormOpen(false);
    setFormApiError(null);
    setFormErrors({});
  };

  const handleFormChange = (name, value) => {
    setFormErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormValues((previous) => {
      const next = { ...previous, [name]: value };

      // Handle maintenance_request_id selection
      if (name === "maintenance_request_id" && value) {
        const selectedRequest = maintenanceRequests.find(
          (req) => String(req.id) === String(value)
        );
        if (selectedRequest) {
          const unitId = selectedRequest.unit_id;
          const matchingTenantUnits = tenantUnits.filter(
            (tu) => tu.unit_id === unitId
          );

          if (matchingTenantUnits.length === 0) {
            // No tenant units - user selects manually, but create line item
            createLineItemFromRequest(selectedRequest, next);
            // Recalculate totals
            const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
            const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
            const includeTax = next.include_tax ?? true;
            const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
            if (gstEnabled && taxPercentage > 0 && includeTax) {
              next.tax_amount = totals.taxAmount;
            }
            next.grand_total = totals.grandTotal;
          } else if (matchingTenantUnits.length === 1) {
            // Single match - auto-select
            next.tenant_unit_id = String(matchingTenantUnits[0].id);
            createLineItemFromRequest(selectedRequest, next);
            // Recalculate totals
            const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
            const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
            const includeTax = next.include_tax ?? true;
            const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
            if (gstEnabled && taxPercentage > 0 && includeTax) {
              next.tax_amount = totals.taxAmount;
            }
            next.grand_total = totals.grandTotal;
          } else {
            // Multiple matches - show selection dialog
            setPendingMaintenanceRequest(selectedRequest);
            setAvailableTenantUnits(matchingTenantUnits);
            setTenantUnitSelectionOpen(true);
            // Don't create line item yet - wait for selection
          }
        }
      }

      // Handle include_tax toggle
      if (name === "include_tax") {
        const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
        const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
        
        const totals = calculateTotals(next, taxPercentage, gstEnabled && value);
        
        if (value && gstEnabled && taxPercentage > 0) {
          // Use calculated tax amount
          next.tax_amount = totals.taxAmount;
        } else {
          // Exclude tax
          next.tax_amount = "0.00";
        }
        
        next.grand_total = totals.grandTotal;
      }

      if (
        ["cost", "tax_amount", "discount_amount"].includes(name)
      ) {
        const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
        const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
        const includeTax = next.include_tax ?? true;
        
        const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
        
        // Only auto-calculate tax if enabled, include_tax is true, and tax_amount wasn't manually changed
        if (gstEnabled && taxPercentage > 0 && includeTax && name !== "tax_amount") {
          // Use calculated tax amount from line items
          next.tax_amount = totals.taxAmount;
        } else if (!includeTax) {
          next.tax_amount = "0.00";
        }
        
        next.grand_total = totals.grandTotal;
      }

      return next;
    });
  };

  const handleLineItemChange = (index, field, value) => {
    setFormValues((previous) => {
      const items = previous.line_items?.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updated = {
          ...item,
          [field]: value,
        };

        const quantity = parseFloat(updated.quantity ?? "0");
        const unitCost = parseFloat(updated.unit_cost ?? "0");
        const total = Number.isFinite(quantity * unitCost) ? (quantity * unitCost).toFixed(2) : "0.00";
        updated.total = total;

        return updated;
      }) ?? [];

      const next = { ...previous, line_items: items };
      
      // Calculate cost from line items
      const lineItemsTotal = items.reduce((acc, item) => {
        const itemTotal = parseFloat(item?.total ?? "0") || 0;
        return acc + itemTotal;
      }, 0);
      next.cost = lineItemsTotal.toFixed(2);
      
      const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
      const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
      const includeTax = next.include_tax ?? true;
      const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
      
      // Auto-calculate tax if enabled and include_tax is true
      if (gstEnabled && taxPercentage > 0 && includeTax) {
        // Use calculated tax amount from line items
        next.tax_amount = totals.taxAmount;
      } else if (!includeTax) {
        next.tax_amount = "0.00";
      }
      
      next.grand_total = totals.grandTotal;
      return next;
    });
  };

  const addLineItem = () => {
    setFormValues((previous) => ({
      ...previous,
      line_items: [...(previous.line_items ?? []), { ...emptyLineItem }],
    }));
  };

  const removeLineItem = (index) => {
    setFormValues((previous) => {
      const items = [...(previous.line_items ?? [])];
      items.splice(index, 1);
      const next = { ...previous, line_items: items.length > 0 ? items : [{ ...emptyLineItem }] };
      const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
      const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
      const includeTax = next.include_tax ?? true;
      const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
      
      // Auto-calculate tax if enabled and include_tax is true
      if (gstEnabled && taxPercentage > 0 && includeTax) {
        next.tax_amount = totals.taxAmount;
      } else if (!includeTax) {
        next.tax_amount = "0.00";
      }
      
      next.grand_total = totals.grandTotal;
      return next;
    });
  };

  const handleTenantUnitSelected = (tenantUnitId) => {
    if (!pendingMaintenanceRequest) return;

    setFormValues((previous) => {
      const next = { ...previous, tenant_unit_id: String(tenantUnitId) };
      createLineItemFromRequest(pendingMaintenanceRequest, next);
      
      // Recalculate totals
      const taxPercentage = systemSettings?.tax?.gst_percentage ?? 0;
      const gstEnabled = systemSettings?.tax?.gst_enabled ?? false;
      const includeTax = next.include_tax ?? true;
      const totals = calculateTotals(next, taxPercentage, gstEnabled && includeTax);
      if (gstEnabled && taxPercentage > 0 && includeTax) {
        next.tax_amount = totals.taxAmount;
      }
      next.grand_total = totals.grandTotal;
      
      return next;
    });

    // Close dialog and clear pending data
    setTenantUnitSelectionOpen(false);
    setPendingMaintenanceRequest(null);
    setAvailableTenantUnits([]);
  };

  const handleTenantUnitSelectionCancel = () => {
    // Close dialog and clear pending data
    setTenantUnitSelectionOpen(false);
    setPendingMaintenanceRequest(null);
    setAvailableTenantUnits([]);
    // Reset maintenance_request_id to empty since we're not using it
    setFormValues((previous) => ({ ...previous, maintenance_request_id: "" }));
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
        throw new Error("You must be logged in before creating maintenance invoices.");
      }

      const payload = buildInvoicePayload(formValues);
      const response = await fetch(`${API_BASE_URL}/maintenance-invoices`, {
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
          `Unable to create maintenance invoice (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const invoice = result?.data ?? result;

      setInvoices((previous) => [invoice, ...previous]);
      setFlashMessage("Maintenance invoice generated successfully.");
      setFormOpen(false);
      setFormValues(initialFormState);
    } catch (err) {
      setFormApiError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    await updateInvoice(invoiceId, {
      status: "paid",
      paid_date: formatDateInput(new Date()),
    });
  };

  const handleSyncStatus = async (invoiceId) => {
    if (!invoiceId || updatingInvoiceId) {
      return;
    }

    setUpdatingInvoiceId(invoiceId);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before syncing invoice status.");
      }

      // First, try to link any unlinked payments
      try {
        const linkResponse = await fetch(`${API_BASE_URL}/maintenance-invoices/${invoiceId}/link-payments`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (linkResponse.ok) {
          const linkResult = await linkResponse.json();
          if (linkResult.linked_count > 0) {
            console.log('Linked payments:', linkResult);
          }
        }
      } catch (linkErr) {
        console.warn('Link payments failed (non-critical):', linkErr);
      }

      // Then sync the status
      const response = await fetch(`${API_BASE_URL}/maintenance-invoices/${invoiceId}/sync-status`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to sync invoice status (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      
      // The response structure is: { message, invoice: {...}, total_paid, grand_total, is_fully_paid }
      const invoice = result?.invoice?.data ?? result?.invoice ?? result?.data;
      
      if (invoice) {
        // Update the invoice in the list
        setInvoices((previous) =>
          previous.map((inv) => (inv.id === invoiceId ? invoice : inv))
        );
      }
      
      let message = result?.message || 
        (result?.is_fully_paid 
          ? `Invoice is fully paid (${result.total_paid} / ${result.grand_total})` 
          : `Invoice status checked. Paid: ${result.total_paid || 0} / ${result.grand_total || 0}`);
      
      // Add info about linked payments if available
      if (result?.linked_payments_count !== undefined) {
        message += ` (${result.linked_payments_count} payment(s) linked)`;
      }
      
      setFlashMessage(message);
      
      // Refresh the list to ensure we have the latest data
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setFlashMessage(err.message || "Failed to sync invoice status.");
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleStatusChange = async (invoiceId, status) => {
    await updateInvoice(invoiceId, { status });
  };

  const updateInvoice = async (invoiceId, payload) => {
    if (!invoiceId || updatingInvoiceId) {
      return;
    }

    setUpdatingInvoiceId(invoiceId);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before updating maintenance invoices.");
      }

      const response = await fetch(`${API_BASE_URL}/maintenance-invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        throw new Error(validationPayload?.message ?? "Validation failed for the update.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Unable to update maintenance invoice (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const invoice = result?.data ?? result;

      setInvoices((previous) =>
        previous.map((item) => (item.id === invoice.id ? invoice : item)),
      );
      setFlashMessage("Maintenance invoice updated.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const openPreview = async (invoice) => {
    if (!invoice?.id) return;

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewInvoice(invoice);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be logged in before viewing the invoice.");
      }

      const response = await fetch(
        `${API_BASE_URL}/maintenance-invoices/${invoice.id}`,
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
      setPreviewInvoice(result?.data ?? result);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewInvoice(null);
    setPreviewError(null);
    setExportingPdf(false);
  };

  const handlePrintPreview = () => {
    if (!previewRef.current || !previewInvoice) return;

    const printContents = previewRef.current.innerHTML;
    const invoiceNumber = previewInvoice?.invoice_number ?? "maintenance-invoice";
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
    if (!previewInvoice) return;

    try {
      setExportingPdf(true);

      const { default: jsPDFModule } = await import("jspdf");
      const jsPDFConstructor = jsPDFModule?.jsPDF ?? jsPDFModule;
      if (typeof jsPDFConstructor !== "function") {
        throw new Error("Unable to load PDF exporter. Please reinstall jspdf.");
      }

      const pdf = new jsPDFConstructor({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const tenantUnit =
        previewInvoice?.tenant_unit ??
        tenantUnitMap.get(previewInvoice?.tenant_unit_id) ??
        null;
      const maintenanceRequest =
        previewInvoice?.maintenance_request ??
        maintenanceRequestMap.get(previewInvoice?.maintenance_request_id) ??
        null;

      renderInvoicePdf(pdf, previewInvoice, tenantUnit, maintenanceRequest);

      const filename = `${(previewInvoice?.invoice_number ?? "maintenance-invoice")
        .toString()
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      setFlashMessage(err.message ?? "Unable to export invoice as PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Maintenance billing centre
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wrench size={24} className="text-primary" />
            Maintenance invoices
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Capture and track maintenance expenses per unit. Summaries refresh with
            each invoice creation or status update.
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
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Generate invoice
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Invoices created" value={stats.total} icon={ClipboardPlus} />
        <SummaryCard
          title="Total maintenance billed"
          value={formatCurrency(stats.totalBilled)}
          icon={FileText}
          tone="info"
        />
        <SummaryCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          icon={AlertTriangle}
          tone="warning"
        />
        <SummaryCard
          title="Collected"
          value={formatCurrency(stats.collected)}
          icon={ClipboardCheck}
          tone="success"
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
              placeholder="Search by invoice number, tenant, unit, or request…"
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

        {optionsError ? (
          <p className="mt-3 text-xs text-red-500">
            {optionsError} — form options may be limited.
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
              loadingMessage="Loading maintenance invoices…"
              emptyMessage={
                Boolean(search.trim()) || statusFilter !== "all"
                  ? "No invoices match your filters"
                  : "No maintenance invoices yet"
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
                  key: "maintenance_request",
                  label: "Maintenance Request",
                  render: (_, item) => {
                    const maintenanceRequest =
                      item?.maintenance_request ??
                      (item?.maintenance_request_id
                        ? maintenanceRequestMap.get(item.maintenance_request_id)
                        : null);
                    const requestLabel =
                      maintenanceRequest?.subject ??
                      (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "—");
                    return <span className="text-sm text-slate-600">{requestLabel}</span>;
                  },
                },
                {
                  key: "invoice_date",
                  label: "Issued",
                  render: (value) => formatDisplayDate(value),
                },
                {
                  key: "due_date",
                  label: "Due",
                  render: (value) => formatDisplayDate(value),
                },
                {
                  key: "grand_total",
                  label: "Total",
                  render: (value) => (
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(toAmount(value))}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <StatusBadge status={value ?? "draft"} />,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => {
                    const status = item?.status ?? "";
                    const updating = updatingInvoiceId === item.id;
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(item);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
                        >
                          <FileText size={14} />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSyncStatus(item.id);
                          }}
                          disabled={updating}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          title="Sync status with payments"
                        >
                          {updating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCcw size={14} />
                          )}
                          Sync
                        </button>
                        {["draft", "sent", "approved", "overdue"].includes(status) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkPaid(item.id);
                            }}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {updating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ClipboardCheck size={14} />
                            )}
                            Mark paid
                          </button>
                        )}
                        {status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(item.id, "cancelled");
                            }}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {updating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <AlertTriangle size={14} />
                            )}
                            Cancel
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              renderCard={(invoice) => (
                <MaintenanceInvoiceCard
                  invoice={invoice}
                  tenantUnitMap={tenantUnitMap}
                  maintenanceRequestMap={maintenanceRequestMap}
                  onView={() => openPreview(invoice)}
                  onMarkPaid={() => handleMarkPaid(invoice.id)}
                  onChangeStatus={(status) => handleStatusChange(invoice.id, status)}
                  updating={updatingInvoiceId === invoice.id}
                />
              )}
              onRowClick={(invoice) => {
                openPreview(invoice);
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

      <MaintenanceInvoiceFormPanel
        open={formOpen}
        values={formValues}
        errors={formErrors}
        submitting={formSubmitting}
        apiError={formApiError}
        onClose={closeForm}
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
        onLineItemChange={handleLineItemChange}
        onAddLineItem={addLineItem}
        onRemoveLineItem={removeLineItem}
        tenantUnitOptions={tenantUnitOptions}
        maintenanceRequestOptions={maintenanceRequestOptions}
        optionsLoading={optionsLoading}
        optionsError={optionsError}
        systemSettings={systemSettings}
      />

      <TenantUnitSelectionDialog
        open={tenantUnitSelectionOpen}
        maintenanceRequest={pendingMaintenanceRequest}
        availableTenantUnits={availableTenantUnits}
        onSelect={handleTenantUnitSelected}
        onCancel={handleTenantUnitSelectionCancel}
      />

      {previewOpen ? (
        <MaintenanceInvoicePreviewDialog
          invoice={previewInvoice}
          tenantUnitMap={tenantUnitMap}
          maintenanceRequestMap={maintenanceRequestMap}
          loading={previewLoading}
          error={previewError}
          exporting={exportingPdf}
          onClose={closePreview}
          onPrint={handlePrintPreview}
          onExport={handleExportPdf}
          previewRef={previewRef}
        />
      ) : null}
    </div>
  );
}

function InvoiceRow({
  invoice,
  tenantUnitMap,
  maintenanceRequestMap,
  onView,
  onMarkPaid,
  onSyncStatus,
  onChangeStatus,
  updating,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);
  const maintenanceRequest =
    invoice?.maintenance_request ??
    (invoice?.maintenance_request_id
      ? maintenanceRequestMap.get(invoice.maintenance_request_id)
      : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const requestLabel =
    maintenanceRequest?.subject ?? (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "—");
  const total = formatCurrency(toAmount(invoice?.grand_total));

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
        {requestLabel}
      </td>
      <td className="px-3 py-3 text-sm text-slate-600">
        {formatDisplayDate(invoice?.invoice_date)}
      </td>
      <td className="px-3 py-3 text-sm text-slate-600">
        {formatDisplayDate(invoice?.due_date)}
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
        {total}
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={invoice?.status ?? "draft"} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary"
          >
            <FileText size={14} />
            View
          </button>
          {onSyncStatus && (
            <button
              type="button"
              onClick={onSyncStatus}
              disabled={updating}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              title="Sync status with payments"
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              Sync
            </button>
          )}
          {["draft", "sent", "approved", "overdue"].includes(invoice?.status ?? "") ? (
            <button
              type="button"
              onClick={onMarkPaid}
              disabled={updating}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ClipboardCheck size={14} />
              )}
              Mark paid
            </button>
          ) : null}
          {invoice?.status !== "cancelled" ? (
            <button
              type="button"
              onClick={() => onChangeStatus("cancelled")}
              disabled={updating}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {updating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <AlertTriangle size={14} />
              )}
              Cancel
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function MaintenanceInvoiceCard({
  invoice,
  tenantUnitMap,
  maintenanceRequestMap,
  onView,
  onMarkPaid,
  onSyncStatus,
  onChangeStatus,
  updating,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);
  const maintenanceRequest =
    invoice?.maintenance_request ??
    (invoice?.maintenance_request_id
      ? maintenanceRequestMap.get(invoice.maintenance_request_id)
      : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const requestLabel =
    maintenanceRequest?.subject ??
    (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "—");
  const total = formatCurrency(toAmount(invoice?.grand_total));
  const status = invoice?.status ?? "draft";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900">
              {invoice?.invoice_number ?? "—"}
            </h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500">
            Created {formatDisplayDate(invoice?.created_at ?? invoice?.invoice_date)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total Amount</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
      </div>

      <div className="mb-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
              Tenant / Unit
            </p>
            <p className="text-sm font-semibold text-slate-900">{tenantName}</p>
            <p className="text-xs text-slate-500">{unitLabel}</p>
          </div>
          {maintenanceRequest && (
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
                Maintenance Request
              </p>
              <p className="text-sm font-semibold text-slate-900">{requestLabel}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50/50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
              Invoice Date
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {formatDisplayDate(invoice?.invoice_date)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">
              Due Date
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {formatDisplayDate(invoice?.due_date)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <FileText size={14} />
          View
        </button>
        {["draft", "sent", "approved", "overdue"].includes(status) && (
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ClipboardCheck size={14} />
            )}
            Mark paid
          </button>
        )}
        {status !== "cancelled" && (
          <button
            type="button"
            onClick={() => onChangeStatus("cancelled")}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AlertTriangle size={14} />
            )}
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

function MaintenanceInvoiceFormPanel({
  open,
  values,
  errors,
  submitting,
  apiError,
  onClose,
  onChange,
  onSubmit,
  onLineItemChange,
  onAddLineItem,
  onRemoveLineItem,
  tenantUnitOptions,
  maintenanceRequestOptions,
  optionsLoading,
  optionsError,
  systemSettings,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
      <div 
        className="absolute inset-0 bg-slate-900/40" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Maintenance billing
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Generate maintenance invoice
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-6">
        {apiError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {optionsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Loading tenant units and maintenance requests…
          </div>
        ) : null}

        {!optionsLoading && tenantUnitOptions.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No tenant units available</p>
              <p className="mt-1 text-xs text-amber-600">
                {optionsError 
                  ? `Error loading tenant units: ${optionsError}` 
                  : "You need to create at least one active tenant-unit assignment before generating maintenance invoices."}
              </p>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                disabled={submitting || optionsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="" disabled>
                  {optionsLoading 
                    ? "Loading tenant units..." 
                    : tenantUnitOptions.length === 0 
                    ? "No tenant units available" 
                    : "Select tenant unit"}
                </option>
                {tenantUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Maintenance request (optional)"
              htmlFor="maintenance_request_id"
              error={errors?.maintenance_request_id}
            >
              <select
                id="maintenance_request_id"
                name="maintenance_request_id"
                value={values.maintenance_request_id}
                onChange={(event) => onChange("maintenance_request_id", event.target.value)}
                disabled={submitting || optionsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Link maintenance request (optional)</option>
                {maintenanceRequestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Invoice number"
              htmlFor="invoice_number"
              hint="Leave empty to auto-generate (e.g., MINV-202401-001)"
              error={errors?.invoice_number}
            >
              <input
                id="invoice_number"
                name="invoice_number"
                value={values.invoice_number}
                onChange={(event) => onChange("invoice_number", event.target.value)}
                placeholder="Auto-generated if left empty"
                disabled={submitting}
                suppressHydrationWarning
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>

            <FormField
              label="Status"
              htmlFor="status"
              error={errors?.status}
            >
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={(event) => onChange("status", event.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusFilters
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
                suppressHydrationWarning
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
                suppressHydrationWarning
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </FormField>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Line items</h3>
                <p className="text-xs text-slate-500">
                  Capture labour, materials, or other billable components.
                </p>
              </div>
              <button
                type="button"
                onClick={onAddLineItem}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:text-primary/80"
              >
                <Plus size={14} />
                Add line item
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {(values.line_items ?? []).map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <FormField
                        label="Description"
                        htmlFor={`line_item_description_${index}`}
                        error={errors?.[`line_items.${index}.description`]}
                      >
                        <input
                          id={`line_item_description_${index}`}
                          value={item.description}
                          onChange={(event) =>
                            onLineItemChange(index, "description", event.target.value)
                          }
                          placeholder="HVAC compressor repair"
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </FormField>
                    </div>

                    <div className="w-[70px] flex-shrink-0">
                      <FormField
                        label="Quantity"
                        htmlFor={`line_item_quantity_${index}`}
                        error={errors?.[`line_items.${index}.quantity`]}
                      >
                        <input
                          id={`line_item_quantity_${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            onLineItemChange(index, "quantity", event.target.value)
                          }
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </FormField>
                    </div>

                    <div className="w-[140px] flex-shrink-0">
                      <FormField
                        label="Unit cost (MVR)"
                        htmlFor={`line_item_unit_cost_${index}`}
                        error={errors?.[`line_items.${index}.unit_cost`]}
                      >
                        <input
                          id={`line_item_unit_cost_${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(event) =>
                            onLineItemChange(index, "unit_cost", event.target.value)
                          }
                          disabled={submitting}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </FormField>
                    </div>

                    <div className="w-[140px] flex-shrink-0">
                      <FormField
                        label="Line total (MVR)"
                        htmlFor={`line_item_total_${index}`}
                        error={errors?.[`line_items.${index}.total`]}
                      >
                        <input
                          id={`line_item_total_${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.total}
                          onChange={(event) =>
                            onLineItemChange(index, "total", event.target.value)
                          }
                          disabled
                          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
                        />
                      </FormField>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveLineItem(index)}
                      disabled={submitting}
                      className="mb-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <label htmlFor="cost" className="w-[140px] text-xs font-semibold text-slate-700 text-right">
                Cost (MVR):
              </label>
              <input
                id="cost"
                name="cost"
                type="number"
                value={values.cost}
                onChange={(event) => onChange("cost", event.target.value)}
                min="0"
                step="0.01"
                disabled={submitting}
                suppressHydrationWarning
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {errors?.cost ? <p className="text-xs font-medium text-red-500 ml-[155px]">{firstError(errors.cost)}</p> : null}

            <div className="flex items-center gap-3">
              <label htmlFor="discount_amount" className="w-[140px] text-xs font-semibold text-slate-700 text-right">
                Discount (MVR):
              </label>
              <input
                id="discount_amount"
                name="discount_amount"
                type="number"
                value={values.discount_amount}
                onChange={(event) => onChange("discount_amount", event.target.value)}
                min="0"
                step="0.01"
                disabled={submitting || false}
                suppressHydrationWarning
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {errors?.discount_amount ? <p className="text-xs font-medium text-red-500 ml-[155px]">{firstError(errors.discount_amount)}</p> : null}

            <div className="flex items-center gap-3 py-2">
              <div className="w-[140px] flex items-center justify-end gap-2">
                <input
                  type="checkbox"
                  id="include_tax"
                  name="include_tax"
                  checked={values.include_tax ?? true}
                  onChange={(event) => onChange("include_tax", event.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="include_tax" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Include tax:
                </label>
              </div>
              <div className="flex-1" />
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="tax_amount" className="w-[140px] text-xs font-semibold text-slate-700 text-right">
                Tax (MVR):
              </label>
              <input
                id="tax_amount"
                name="tax_amount"
                type="number"
                value={values.tax_amount}
                onChange={(event) => onChange("tax_amount", event.target.value)}
                min="0"
                step="0.01"
                disabled={submitting || !(values.include_tax ?? true) || (systemSettings?.tax?.gst_enabled && systemSettings?.tax?.gst_percentage > 0 && (values.include_tax ?? true))}
                suppressHydrationWarning
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {systemSettings?.tax?.gst_enabled && systemSettings?.tax?.gst_percentage > 0 && values.include_tax && (
              <p className="text-xs text-slate-500 ml-[155px]">
                Auto-calculated: {systemSettings.tax.gst_percentage}% (from System Settings)
              </p>
            )}
            {!values.include_tax && (
              <p className="text-xs text-slate-500 ml-[155px]">
                Tax excluded from invoice
              </p>
            )}
            {errors?.tax_amount ? <p className="text-xs font-medium text-red-500 ml-[155px]">{firstError(errors.tax_amount)}</p> : null}

            <div className="flex items-center gap-3">
              <label htmlFor="grand_total" className="w-[140px] text-xs font-semibold text-slate-700 text-right">
                Grand total (MVR):
              </label>
              <input
                id="grand_total"
                name="grand_total"
                type="number"
                min="0"
                step="0.01"
                value={values.grand_total}
                onChange={(event) => onChange("grand_total", event.target.value)}
                required
                disabled={true}
                suppressHydrationWarning
                className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
              />
            </div>
            {errors?.grand_total ? <p className="text-xs font-medium text-red-500 ml-[155px]">{firstError(errors.grand_total)}</p> : null}
          </section>

          <FormField
            label="Notes"
            htmlFor="notes"
            error={errors?.notes}
          >
            <textarea
              id="notes"
              name="notes"
              value={values.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              placeholder="Additional billing details or approvals…"
              disabled={submitting}
              className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
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
                  Saving…
                </>
              ) : (
                <>
                  <ClipboardPlus size={16} />
                  Create invoice
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

function TenantUnitSelectionDialog({
  open,
  maintenanceRequest,
  availableTenantUnits,
  onSelect,
  onCancel,
}) {
  if (!open || !maintenanceRequest) return null;

  const requestLabel =
    maintenanceRequest?.subject ||
    maintenanceRequest?.description ||
    (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "Maintenance Request");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Select Tenant Unit
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">Multiple tenants found</h2>
          <p className="mt-2 text-sm text-slate-600">
            This maintenance request is associated with a unit that has multiple tenants. Please select which tenant should receive the invoice.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Maintenance Request
          </p>
          <p className="text-sm font-medium text-slate-900">{requestLabel}</p>
        </div>

        <div className="mb-6 space-y-2 max-h-96 overflow-y-auto">
          {availableTenantUnits.map((tenantUnit) => {
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
              <button
                key={tenantUnit.id}
                type="button"
                onClick={() => onSelect(tenantUnit.id)}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="font-semibold text-slate-900">{tenantName}</div>
                <div className="text-xs text-slate-500 mt-1">{unitLabel}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceInvoicePreviewDialog({
  invoice,
  tenantUnitMap,
  maintenanceRequestMap,
  loading,
  error,
  exporting,
  onClose,
  onPrint,
  onExport,
  previewRef,
}) {
  const tenantUnit =
    invoice?.tenant_unit ??
    (invoice?.tenant_unit_id ? tenantUnitMap.get(invoice.tenant_unit_id) : null);
  const maintenanceRequest =
    invoice?.maintenance_request ??
    (invoice?.maintenance_request_id
      ? maintenanceRequestMap.get(invoice.maintenance_request_id)
      : null);

  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const propertyName = tenantUnit?.unit?.property?.name ?? "";
  const requestLabel =
    maintenanceRequest?.subject ?? (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "—");

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
              {invoice?.invoice_number ?? "Maintenance invoice"}
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
                  Maintenance billing
                </p>
                <h3 className="text-xl font-semibold text-slate-900">
                  RentApplicaiton · Property Services
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Maldives portfolio · Maintenance finance desk
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
                  <StatusBadge status={invoice?.status ?? "draft"} />
                </div>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bill to
                </h4>
                <p className="text-sm font-semibold text-slate-900">{tenantName}</p>
                <p className="text-xs text-slate-500">Unit {unitLabel}</p>
                {propertyName ? (
                  <p className="text-xs text-slate-400">{propertyName}</p>
                ) : null}
                <p className="text-xs text-slate-400">
                  Linked request: {requestLabel}
                </p>
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
                    {formatDisplayDate(invoice?.due_date)}
                  </span>
                </div>
                {invoice?.paid_date ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Paid date
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {formatDisplayDate(invoice?.paid_date)}
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
                      Qty
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold text-right">
                      Unit cost
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(invoice?.line_items ?? []).length > 0 ? (
                    invoice.line_items.map((item, index) => (
                      <tr key={`${item.description}-${index}`}>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {item.description}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-600">
                          {Number(item.quantity ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-slate-600">
                          {formatCurrency(item.unit_cost ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(item.total ?? 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-3 text-sm text-slate-500" colSpan={4}>
                        Line-item detail unavailable. Review notes below for cost breakdown.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Cost</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(invoice?.cost ?? ((invoice?.labor_cost ?? 0) + (invoice?.parts_cost ?? 0)))}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Tax</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(invoice?.tax_amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Discount</span>
                <span className="font-semibold text-red-600">
                  − {formatCurrency(invoice?.discount_amount)}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Total due</span>
                <span>{formatCurrency(invoice?.grand_total)}</span>
              </div>
            </section>

            {invoice?.notes ? (
              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h4>
                <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
              </section>
            ) : null}

            <footer className="border-t border-dashed border-slate-200 pt-4 text-xs text-slate-400">
              Generated by RentApplicaiton ·{" "}
              {formatDisplayDate(invoice?.created_at ?? new Date())}
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

function StatusBadge({ status }) {
  const config = {
    draft: {
      label: "Draft",
      className: "bg-slate-200 text-slate-700",
    },
    sent: {
      label: "Sent",
      className: "bg-sky-100 text-sky-700",
    },
    approved: {
      label: "Approved",
      className: "bg-indigo-100 text-indigo-700",
    },
    paid: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-600",
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

  const tone = config[status] ?? config.draft;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      {tone.label}
    </span>
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
          We couldn't load maintenance invoices
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
        <Wrench size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {hasFilters ? "No maintenance invoices match your filters" : "No maintenance invoices yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Adjust your filters or clear search to see more results."
            : "Generate your first invoice to start tracking maintenance cost recovery."}
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

function createLineItemFromRequest(request, formValues) {
  const description = request.description || request.subject || 'Maintenance Request';
  const formattedDescription = `Maintenance: ${description}`;
  const cost = request.cost ? Number(request.cost).toFixed(2) : "0.00";
  
  const newLineItem = {
    description: formattedDescription,
    quantity: "1",
    unit_cost: cost,
    total: cost,
  };
  
  // Replace first empty item or add new
  const currentItems = formValues.line_items || [];
  if (currentItems.length === 0 || (currentItems.length === 1 && !currentItems[0].description)) {
    formValues.line_items = [newLineItem];
  } else {
    formValues.line_items = [...currentItems, newLineItem];
  }
}

function calculateTotals(values, taxPercentage = 0, taxEnabled = false) {
  // Get cost from form (or calculate from line items if not provided)
  let cost = Number.isFinite(parseFloat(values.cost))
    ? parseFloat(values.cost)
    : 0;

  // If cost is not set, calculate from line items
  if (cost === 0 && values.line_items && values.line_items.length > 0) {
    const lineItems = values.line_items ?? [];
    cost = lineItems.reduce((acc, item) => acc + toAmount(item?.total), 0);
  }

  // Get amounts from form values
  const tax_amount = Number.isFinite(parseFloat(values.tax_amount))
    ? parseFloat(values.tax_amount)
    : 0;
  const discount_amount = Number.isFinite(parseFloat(values.discount_amount))
    ? parseFloat(values.discount_amount)
    : 0;

  // Calculate subtotal for tax calculation: cost - discount
  const subtotal = cost - discount_amount;

  // Auto-calculate tax if enabled, otherwise use manual entry
  let calculatedTax;
  if (taxEnabled && taxPercentage > 0) {
    calculatedTax = (subtotal * taxPercentage / 100);
  } else {
    calculatedTax = tax_amount;
  }

  // Grand total = cost + tax - discount (matching backend validation)
  const grand_total = (cost + calculatedTax - discount_amount).toFixed(2);

  return {
    taxAmount: calculatedTax.toFixed(2),
    grandTotal: grand_total,
  };
}

function buildInvoicePayload(values) {
  const lineItems = (values.line_items ?? [])
    .map((item) => ({
      description: (item.description ?? "").trim(),
      quantity: Number(item.quantity ?? 0),
      unit_cost: Number(item.unit_cost ?? 0),
      total: Number(item.total ?? 0),
    }))
    .filter((item) => item.description.length > 0);

  // Get cost from form (or calculate from line items if not provided)
  let cost = Number.isFinite(parseFloat(values.cost))
    ? parseFloat(values.cost)
    : 0;

  // If cost is not set, calculate from line items
  if (cost === 0 && lineItems.length > 0) {
    cost = lineItems.reduce((acc, item) => acc + (item.total ?? 0), 0);
  }

  // Ensure grand_total matches the backend validation formula
  const tax_amount = Number(values.tax_amount ?? 0);
  const discount_amount = Number(values.discount_amount ?? 0);
  
  // Calculate expected grand_total: cost + tax - discount
  const expectedGrandTotal = cost + tax_amount - discount_amount;
  
  // Use the calculated grand_total from form (which should match) or recalculate if needed
  const grand_total = Number(values.grand_total ?? expectedGrandTotal);

  return {
    tenant_unit_id: values.tenant_unit_id ? Number(values.tenant_unit_id) : null,
    maintenance_request_id: values.maintenance_request_id
      ? Number(values.maintenance_request_id)
      : null,
    invoice_number: (values.invoice_number ?? "").trim(),
    invoice_date: values.invoice_date || null,
    due_date: values.due_date || null,
    status: values.status ?? "draft",
    cost: Number(cost.toFixed(2)),
    tax_amount: Number(tax_amount.toFixed(2)),
    discount_amount: Number(discount_amount.toFixed(2)),
    grand_total: Number(grand_total.toFixed(2)),
    line_items: lineItems,
    notes: values.notes ?? null,
    paid_date: values.paid_date || null,
  };
}

function renderInvoicePdf(pdf, invoice, tenantUnit, maintenanceRequest) {
  const tenantName =
    tenantUnit?.tenant?.full_name ?? `Tenant #${tenantUnit?.tenant_id ?? "—"}`;
  const unitLabel =
    tenantUnit?.unit?.unit_number ??
    (tenantUnit?.unit?.id
      ? `Unit #${tenantUnit.unit.id}`
      : tenantUnit?.unit_id
      ? `Unit #${tenantUnit.unit_id}`
      : "Unassigned");
  const propertyName = tenantUnit?.unit?.property?.name ?? "";
  const requestLabel =
    maintenanceRequest?.subject ?? (maintenanceRequest?.id ? `Request #${maintenanceRequest.id}` : "—");

  const marginX = 48;
  let cursorY = 72;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Maintenance Invoice", marginX, cursorY);

  cursorY += 28;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Invoice #: ${invoice?.invoice_number ?? "—"}`, marginX, cursorY);
  cursorY += 16;
  pdf.text(`Invoice date: ${formatDisplayDate(invoice?.invoice_date)}`, marginX, cursorY);
  cursorY += 16;
  pdf.text(`Due date: ${formatDisplayDate(invoice?.due_date)}`, marginX, cursorY);

  cursorY += 24;
  pdf.setFont("helvetica", "bold");
  pdf.text("Bill to", marginX, cursorY);
  cursorY += 18;
  pdf.setFont("helvetica", "normal");
  pdf.text(tenantName, marginX, cursorY);
  cursorY += 16;
  pdf.text(`Unit: ${unitLabel}`, marginX, cursorY);
  if (propertyName) {
    cursorY += 16;
    pdf.text(`Property: ${propertyName}`, marginX, cursorY);
  }
  cursorY += 16;
  pdf.text(`Maintenance request: ${requestLabel}`, marginX, cursorY);

  cursorY += 28;
  pdf.setLineWidth(0.5);
  pdf.line(marginX, cursorY, marginX + 480, cursorY);
  cursorY += 16;

  pdf.setFont("helvetica", "bold");
  pdf.text("Description", marginX, cursorY);
  pdf.text("Qty", marginX + 280, cursorY);
  pdf.text("Unit cost", marginX + 360, cursorY);
  pdf.text("Total", marginX + 440, cursorY);
  cursorY += 12;
  pdf.line(marginX, cursorY, marginX + 480, cursorY);
  cursorY += 18;

  pdf.setFont("helvetica", "normal");
  const lineItems = invoice?.line_items ?? [];
  if (lineItems.length > 0) {
    lineItems.forEach((item) => {
      pdf.text(item.description ?? "—", marginX, cursorY);
      pdf.text(String(item.quantity ?? 0), marginX + 280, cursorY, { align: "right" });
      pdf.text(formatCurrency(item.unit_cost ?? 0), marginX + 360, cursorY, { align: "right" });
      pdf.text(formatCurrency(item.total ?? 0), marginX + 440, cursorY, { align: "right" });
      cursorY += 18;
    });
  } else {
    pdf.text("Line-item detail unavailable. See notes for cost breakdown.", marginX, cursorY);
    cursorY += 18;
  }

  cursorY += 10;
  pdf.line(marginX, cursorY, marginX + 480, cursorY);
  cursorY += 20;

  const cost = invoice?.cost ?? ((invoice?.labor_cost ?? 0) + (invoice?.parts_cost ?? 0));
  const totals = [
    ["Cost", formatCurrency(cost)],
    ["Tax", formatCurrency(invoice?.tax_amount)],
    ["Discount", `− ${formatCurrency(invoice?.discount_amount)}`],
  ];

  pdf.setFont("helvetica", "bold");
  totals.forEach(([label, amount]) => {
    pdf.text(label, marginX, cursorY);
    pdf.text(amount, marginX + 440, cursorY, { align: "right" });
    cursorY += 18;
  });

  pdf.line(marginX, cursorY, marginX + 480, cursorY);
  cursorY += 22;
  pdf.setFontSize(13);
  pdf.text("Total due", marginX, cursorY);
  pdf.text(formatCurrency(invoice?.grand_total), marginX + 440, cursorY, { align: "right" });

  cursorY += 28;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const paymentNote = pdf.splitTextToSize(
    "Please remit payment to the landlord treasury account. Include the invoice number in the reference for automated reconciliation.",
    480,
  );
  pdf.text(paymentNote, marginX, cursorY);
  cursorY += paymentNote.length * 14 + 10;

  if (invoice?.notes) {
    const notesLabel = "Notes:";
    pdf.setFont("helvetica", "bold");
    pdf.text(notesLabel, marginX, cursorY);
    pdf.setFont("helvetica", "normal");
    const notesLines = pdf.splitTextToSize(invoice.notes, 460);
    pdf.text(notesLines, marginX + 48, cursorY);
    cursorY += notesLines.length * 14 + 10;
  }

  if (invoice?.status === "overdue") {
    pdf.setTextColor(200, 30, 30);
    pdf.text(
      "This invoice is overdue. Late fees continue to accrue until payment is received.",
      marginX,
      cursorY,
    );
    pdf.setTextColor(0, 0, 0);
    cursorY += 18;
  }

  cursorY += 12;
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Generated by RentApplicaiton on ${formatDisplayDate(invoice?.created_at ?? new Date())}`,
    marginX,
    cursorY,
  );
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



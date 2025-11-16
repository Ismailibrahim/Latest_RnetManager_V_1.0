"use client";

import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "@/utils/api-error-handler";
import { invalidateCache } from "@/utils/api-cache";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Custom hook for managing system settings
 *
 * @returns {object} { settings, loading, error, updateSettings, updateCompany, updateCurrency, updateInvoiceNumbering, updatePaymentTerms, updateSystemPreferences, updateDocuments, refetch }
 */
export function useSystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to view system settings.");
      }

      const response = await fetch(`${API_BASE_URL}/settings/system`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // Response is not JSON
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        // Response was not successful
        const errorMessage = data?.message || data?.error || `HTTP ${response.status} Error`;
        throw new Error(errorMessage);
      }

      // Handle response structure - could be { data: {...} } or direct object
      setSettings(data?.data || data);
      setError(null);
    } catch (err) {
      // If it's already an Error object, use it directly
      if (err instanceof Error) {
        setError(err);
      } else {
        // Otherwise, try to handle it with the error handler
        const handledError = await handleApiError(err);
        setError(handledError);
      }
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update system settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    setSettings(data.data || data);
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, []);

  const updateCompany = useCallback(async (companySettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update company settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/company`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(companySettings),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        company: data.company,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateCurrency = useCallback(async (currencySettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update currency settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/currency`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(currencySettings),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        currency: data.currency,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateInvoiceNumbering = useCallback(async (invoiceNumberingSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update invoice numbering settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/invoice-numbering`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceNumberingSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        invoice_numbering: data.invoice_numbering,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updatePaymentTerms = useCallback(async (paymentTermsSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update payment terms settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/payment-terms`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentTermsSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        payment_terms: data.payment_terms,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateSystemPreferences = useCallback(async (systemPreferencesSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update system preferences settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/system-preferences`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(systemPreferencesSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        system: data.system,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateDocuments = useCallback(async (documentSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update document settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/documents`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(documentSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        documents: data.documents,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const updateTax = useCallback(async (taxSettings) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update tax settings.");
    }

    const response = await fetch(
      `${API_BASE_URL}/settings/system/tax`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taxSettings),
      }
    );

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    if (settings) {
      setSettings({
        ...settings,
        tax: data.tax,
      });
    }
    invalidateCache(`${API_BASE_URL}/settings/system`);
    return data;
  }, [settings]);

  const refetch = useCallback(() => {
    return fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    updateCompany,
    updateCurrency,
    updateInvoiceNumbering,
    updatePaymentTerms,
    updateSystemPreferences,
    updateDocuments,
    updateTax,
    refetch,
  };
}


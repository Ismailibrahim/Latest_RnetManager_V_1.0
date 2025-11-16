"use client";

import { useState, useCallback, useEffect } from "react";
import { handleApiError } from "@/utils/api-error-handler";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Custom hook for managing SMS templates
 *
 * @returns {object} { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, setDefault, preview, refetch }
 */
export function useSmsTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async (type = null) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to view SMS templates.");
      }

      const url = type
        ? `${API_BASE_URL}/sms-templates?type=${type}`
        : `${API_BASE_URL}/sms-templates`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      const data = await response.json();
      setTemplates(data.data || []);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      } else {
        const handledError = await handleApiError(err);
        setError(handledError);
      }
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to create SMS templates.");
    }

    const response = await fetch(`${API_BASE_URL}/sms-templates`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    return data;
  }, []);

  const updateTemplate = useCallback(async (id, templateData) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update SMS templates.");
    }

    const response = await fetch(`${API_BASE_URL}/sms-templates/${id}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    return data;
  }, []);

  const deleteTemplate = useCallback(async (id) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to delete SMS templates.");
    }

    const response = await fetch(`${API_BASE_URL}/sms-templates/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    return true;
  }, []);

  const setDefault = useCallback(async (id) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to set default SMS templates.");
    }

    const response = await fetch(`${API_BASE_URL}/sms-templates/${id}/set-default`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    return data;
  }, []);

  const preview = useCallback(async (id, sampleData = null) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to preview SMS templates.");
    }

    const response = await fetch(`${API_BASE_URL}/sms-templates/${id}/preview`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: sampleData }),
    });

    if (!response.ok) {
      throw await handleApiError(response);
    }

    const data = await response.json();
    return data;
  }, []);

  const refetch = useCallback((type = null) => {
    return fetchTemplates(type);
  }, [fetchTemplates]);

  // Auto-fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,
    preview,
    refetch,
  };
}


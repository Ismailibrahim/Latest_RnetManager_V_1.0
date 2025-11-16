"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "unified_payment_templates";

function loadTemplates() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string"
    );
  } catch {
    return [];
  }
}

function persistTemplates(templates) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // swallow
  }
}

function createTemplateId() {
  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function usePaymentTemplates() {
  const [templates, setTemplates] = useState(() => loadTemplates());

  useEffect(() => {
    persistTemplates(templates);
  }, [templates]);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const saveTemplate = useCallback((template) => {
    if (!template?.name) {
      throw new Error("Template name is required.");
    }

    const newTemplate = {
      ...template,
      id: createTemplateId(),
      created_at: new Date().toISOString(),
    };

    setTemplates((current) => [...current, newTemplate]);

    return newTemplate;
  }, []);

  const deleteTemplate = useCallback((id) => {
    setTemplates((current) => current.filter((template) => template.id !== id));
  }, []);

  const clearTemplates = useCallback(() => {
    setTemplates([]);
  }, []);

  return {
    templates: sortedTemplates,
    saveTemplate,
    deleteTemplate,
    clearTemplates,
  };
}



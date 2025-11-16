"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function formatPaymentMethodLabel(name) {
  if (!name) {
    return "";
  }

  const normalized = String(name).replace(/[_-]+/g, " ").trim();

  if (normalized.length === 0) {
    return "";
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function usePaymentMethods({ onlyActive = true } = {}) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchMethods() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("You must be logged in to load payment methods.");
        }

        const url = new URL(`${API_BASE_URL}/payment-methods`);
        if (onlyActive) {
          url.searchParams.set("only_active", "1");
        }
        url.searchParams.set("per_page", "100");

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
            `Unable to load payment methods (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        if (isMounted) {
          setMethods(data);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMethods();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [onlyActive, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const options = useMemo(() => {
    return methods
      .slice()
      .sort((a, b) => {
        if (a.sort_order === b.sort_order) {
          return a.name.localeCompare(b.name);
        }
        return a.sort_order - b.sort_order;
      })
      .map((method) => ({
        value: method.name,
        label: formatPaymentMethodLabel(method.name),
        data: method,
      }));
  }, [methods]);

  const labelByName = useMemo(() => {
    const map = new Map();
    methods.forEach((method) => {
      map.set(method.name, formatPaymentMethodLabel(method.name));
    });
    return map;
  }, [methods]);

  return {
    methods,
    options,
    labels: labelByName,
    loading,
    error,
    refresh,
  };
}


"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function usePendingCharges(tenantUnitId, { enabled = true } = {}) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled || !tenantUnitId) {
      setCharges([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchPendingCharges() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view pending charges.");
        }

        const response = await fetch(
          `${API_BASE_URL}/tenant-units/${tenantUnitId}/pending-charges`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load pending charges (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const items = Array.isArray(payload?.data) ? payload.data : [];
        setCharges(items);
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

    fetchPendingCharges();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnitId, enabled, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map();

    charges.forEach((charge) => {
      const key = charge.source_type;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(charge);
    });

    map.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => {
        const aDate = a?.due_date ?? a?.issued_date ?? "";
        const bDate = b?.due_date ?? b?.issued_date ?? "";
        return aDate.localeCompare(bDate);
      });
      map.set(key, sorted);
    });

    return map;
  }, [charges]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return {
    charges,
    grouped,
    loading,
    error,
    refresh,
  };
}

"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/utils/api-config";

export function useTenantUnits({ enabled = true, status = "active" } = {}) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setUnits([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchTenantUnits() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "Please log in so we can load tenant information."
          );
        }

        const url = new URL(`${API_BASE_URL}/tenant-units`);
        url.searchParams.set("per_page", "200");

        if (status) {
          url.searchParams.set("status", status);
        }

        url.searchParams.set("include", "tenant,unit,unit.property");

        // Note: The backend automatically filters tenant units by the logged-in owner's landlord_id.
        // The TenantUnitController::index() method filters by $request->user()->landlord_id,
        // ensuring users only see tenant units (and their associated properties) that belong to their account.

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
            `Unable to load tenants (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setUnits(data);
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

    fetchTenantUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled, status, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return {
    units,
    loading,
    error,
    refresh,
  };
}



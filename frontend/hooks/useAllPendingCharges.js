"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/utils/api-config";

export function useAllPendingCharges(tenantUnits, { enabled = true } = {}) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled || !Array.isArray(tenantUnits) || tenantUnits.length === 0) {
      setCharges([]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchAllPendingCharges() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Please log in to view pending charges.");
        }

        // Fetch pending charges for all tenant units in parallel
        const chargePromises = tenantUnits.map(async (tenantUnit) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/tenant-units/${tenantUnit.id}/pending-charges`,
              {
                signal: controller.signal,
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) {
              // Silently fail for individual units, but log for debugging
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `Failed to fetch charges for tenant unit ${tenantUnit.id}:`,
                  response.status
                );
              }
              return [];
            }

            const payload = await response.json();
            const items = Array.isArray(payload?.data) ? payload.data : [];
            
            // Filter out paid invoices and enrich with tenant unit info
            return items
              .filter((item) => item.status !== "paid")
              .map((item) => ({
                ...item,
                tenant_unit_id: tenantUnit.id,
                tenant_unit: {
                  id: tenantUnit.id,
                  tenant: tenantUnit.tenant
                    ? {
                        id: tenantUnit.tenant.id,
                        full_name: tenantUnit.tenant.full_name,
                      }
                    : null,
                  unit: tenantUnit.unit
                    ? {
                        id: tenantUnit.unit.id,
                        unit_number: tenantUnit.unit.unit_number,
                        property: tenantUnit.unit.property
                          ? {
                              id: tenantUnit.unit.property.id,
                              name: tenantUnit.unit.property.name,
                            }
                          : null,
                      }
                    : null,
                },
              }));
          } catch (err) {
            if (err.name === "AbortError") {
              return [];
            }
            // Silently fail for individual units
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `Error fetching charges for tenant unit ${tenantUnit.id}:`,
                err
              );
            }
            return [];
          }
        });

        const allChargesArrays = await Promise.all(chargePromises);
        if (!isMounted) return;

        // Flatten all charges into a single array
        const allCharges = allChargesArrays.flat();
        setCharges(allCharges);
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

    fetchAllPendingCharges();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantUnits, enabled, refreshKey]);

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

  const groupedByUnit = useMemo(() => {
    const map = new Map();

    charges.forEach((charge) => {
      const unitId = charge.tenant_unit_id;
      if (!map.has(unitId)) {
        map.set(unitId, []);
      }
      map.get(unitId).push(charge);
    });

    return map;
  }, [charges]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return {
    charges,
    grouped,
    groupedByUnit,
    loading,
    error,
    refresh,
  };
}

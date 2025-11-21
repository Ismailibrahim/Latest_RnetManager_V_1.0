"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/utils/api-config";

export function useCurrencies({ onlyActive = true } = {}) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchCurrencies() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("You must be logged in to load currencies.");
        }

        const url = new URL(`${API_BASE_URL}/currencies`);
        if (onlyActive) {
          url.searchParams.set("only_active", "1");
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
            `Unable to load currencies (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        if (isMounted) {
          setCurrencies(data);
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

    fetchCurrencies();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [onlyActive, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const options = useMemo(() => {
    return currencies
      .slice()
      .sort((a, b) => {
        if (a.sort_order === b.sort_order) {
          return a.name.localeCompare(b.name);
        }
        return a.sort_order - b.sort_order;
      })
      .map((currency) => ({
        value: currency.code,
        label: `${currency.code} - ${currency.name}${currency.symbol ? ` (${currency.symbol})` : ""}`,
        data: currency,
      }));
  }, [currencies]);

  const codeByName = useMemo(() => {
    const map = new Map();
    currencies.forEach((currency) => {
      map.set(currency.code, currency);
    });
    return map;
  }, [currencies]);

  return {
    currencies,
    options,
    codeByName,
    loading,
    error,
    refresh,
  };
}


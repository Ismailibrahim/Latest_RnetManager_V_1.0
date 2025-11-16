"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cachedFetch, invalidateCache } from "@/utils/api-cache";
import { handleApiError } from "@/utils/api-error-handler";

/**
 * Custom hook for cached API fetching
 * 
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch and cache options
 * @returns {object} { data, loading, error, refetch, invalidate }
 */
export function useCachedFetch(url, options = {}) {
  const {
    enabled = true,
    cache = true,
    cacheTTL,
    dependencies = [],
    ...fetchOptions
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await cachedFetch(url, {
        ...fetchOptions,
        cache,
        cacheTTL,
        signal: abortControllerRef.current.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      const result = await response.json();
      setData(result.data || result);
      setError(null);
    } catch (err) {
      if (err.name === "AbortError") {
        return; // Request was cancelled
      }
      const handledError = await handleApiError(err);
      setError(handledError);
      setData(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [url, enabled, cache, cacheTTL, JSON.stringify(fetchOptions), ...dependencies]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    invalidateCache(url);
    return fetchData();
  }, [url, fetchData]);

  const invalidate = useCallback(() => {
    invalidateCache(url);
  }, [url]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}


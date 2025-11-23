"use client";

import { useState, useCallback } from "react";
import { API_BASE_URL } from "@/utils/api-config";

/**
 * Hook for managing admin subscription operations.
 * Only accessible to super_admin users.
 */
export function useAdminSubscriptions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all landlords with subscription information.
   */
  const fetchAllLandlords = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const url = new URL(`${API_BASE_URL}/admin/landlords`);
      
      // Add query parameters
      if (filters.subscription_tier) {
        url.searchParams.set("subscription_tier", filters.subscription_tier);
      }
      if (filters.subscription_status) {
        url.searchParams.set("subscription_status", filters.subscription_status);
      }
      if (filters.expires_before) {
        url.searchParams.set("expires_before", filters.expires_before);
      }
      if (filters.expires_after) {
        url.searchParams.set("expires_after", filters.expires_after);
      }
      if (filters.search) {
        url.searchParams.set("search", filters.search);
      }
      if (filters.sort_by) {
        url.searchParams.set("sort_by", filters.sort_by);
      }
      if (filters.sort_order) {
        url.searchParams.set("sort_order", filters.sort_order);
      }
      if (filters.per_page) {
        url.searchParams.set("per_page", String(filters.per_page));
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to fetch landlords (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch single landlord details.
   */
  const fetchLandlordDetails = useCallback(async (landlordId) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/landlords/${landlordId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to fetch landlord (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload?.data ?? payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update landlord subscription.
   */
  const updateLandlordSubscription = useCallback(async (landlordId, data) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlordId}/subscription`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to update subscription (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload?.data ?? payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Extend subscription by months.
   */
  const extendSubscription = useCallback(async (landlordId, months) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlordId}/subscription/extend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ months }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to extend subscription (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload?.data ?? payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Suspend subscription.
   */
  const suspendSubscription = useCallback(async (landlordId) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlordId}/subscription/suspend`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to suspend subscription (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload?.data ?? payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Activate subscription.
   */
  const activateSubscription = useCallback(async (landlordId, months = 1) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No API token found. Please log in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/landlords/${landlordId}/subscription/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ months }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message ?? `Failed to activate subscription (HTTP ${response.status})`
        );
      }

      const payload = await response.json();
      return payload?.data ?? payload;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchAllLandlords,
    fetchLandlordDetails,
    updateLandlordSubscription,
    extendSubscription,
    suspendSubscription,
    activateSubscription,
  };
}


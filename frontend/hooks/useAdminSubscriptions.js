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

    // Get token outside try block so it's accessible in catch
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      const error = new Error("No API token found. Please log in.");
      setError(error.message);
      throw error;
    }

    try {
      // Build query string
      const params = new URLSearchParams();
      if (filters.subscription_tier) {
        params.set("subscription_tier", filters.subscription_tier);
      }
      if (filters.subscription_status) {
        params.set("subscription_status", filters.subscription_status);
      }
      if (filters.expires_before) {
        params.set("expires_before", filters.expires_before);
      }
      if (filters.expires_after) {
        params.set("expires_after", filters.expires_after);
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.sort_by) {
        params.set("sort_by", filters.sort_by);
      }
      if (filters.sort_order) {
        params.set("sort_order", filters.sort_order);
      }
      if (filters.per_page) {
        params.set("per_page", String(filters.per_page));
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/admin/landlords${queryString ? `?${queryString}` : ""}`;

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        // Using logger would require importing, keeping console for now but could be improved
        // logger.debug('[Admin Subscriptions] Fetching:', url);
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        mode: "cors",
        credentials: "include",
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
      // Handle network errors (CORS, server down, etc.)
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        // Concise error message for users
        const conciseMessage = "Unable to connect to the server. Please check your connection and ensure the backend is running.";
        
        // Store detailed troubleshooting info separately (can be shown in expandable section)
        const detailedInfo = {
          message: conciseMessage,
          troubleshooting: [
            `Backend server should be running at ${API_BASE_URL}`,
            "Ensure you are logged in with a super_admin account",
            "Check browser console Network tab for CORS errors",
            "Restart backend: Stop (Ctrl+C) and run 'php artisan serve' again",
          ],
        };
        
        setError(conciseMessage);
        throw new Error(conciseMessage);
      }
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


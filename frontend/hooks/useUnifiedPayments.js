"use client";

import { useCallback, useState } from "react";
import { API_BASE_URL } from "@/utils/api-config";

export function useUnifiedPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPayment = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "Authentication token missing. Please log in and try again."
        );
      }

      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Get error message from multiple possible locations
        let message = data?.message;
        
        // If no message, try to get it from error object
        if (!message && data?.error) {
          if (typeof data.error === 'string') {
            message = data.error;
          } else if (data.error?.message) {
            message = data.error.message;
          }
        }
        
        // Fallback to generic message
        if (!message) {
          message = "We couldn't create the payment. Please review the fields and try again.";
        }
        
        const details = data?.errors ?? data?.error ?? null;

        const error = new Error(message);
        error.details = details;
        error.errorData = data; // Include full error data for debugging
        throw error;
      }

      return data?.data ?? null;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPayment,
    loading,
    error,
  };
}



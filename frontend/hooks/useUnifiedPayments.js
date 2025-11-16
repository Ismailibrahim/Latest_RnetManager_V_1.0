"use client";

import { useCallback, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

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
        const message =
          data?.message ??
          "We couldn’t create the payment. Please review the fields and try again.";
        const details = data?.errors ?? null;

        const error = new Error(message);
        error.details = details;
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



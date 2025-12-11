"use client";

import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "@/utils/api-error-handler";
import { invalidateCache } from "@/utils/api-cache";
import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api-config";

/**
 * Custom hook for managing Telegram settings
 *
 * @returns {object} { settings, loading, error, updateSettings, testTelegram, refetch }
 */
export function useTelegramSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("You must be signed in to view Telegram settings.");
      }

      const response = await fetch(`${API_BASE_URL}/settings/system/telegram`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status} Error`;
        throw new Error(errorMessage);
      }

      setSettings(data?.telegram || data);
      setError(null);
    } catch (err) {
      const handledError =
        err instanceof Error ? err : await handleApiError(err);

      setError(handledError?.message ?? "An unexpected error occurred.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to update Telegram settings.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/telegram`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await handleApiError(response, { logError: false });
      
      // Enhance error message for authorization errors
      if (response.status === 403 || response.status === 500) {
        // Try to get more details from the error response
        try {
          const text = await response.text();
          if (text) {
            try {
              const errorData = JSON.parse(text);
              if (errorData.message) {
                error.message = errorData.message;
              }
            } catch (e) {
              // Not JSON, keep original error
            }
          }
        } catch (e) {
          // Failed to read response, keep original error
        }
      }
      
      throw error;
    }

    const data = await response.json();
    setSettings(data.telegram || data);
    invalidateCache(`${API_BASE_URL}/settings/system/telegram`);
    return data;
  }, []);

  const testTelegram = useCallback(async (chatId) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be signed in to test Telegram.");
    }

    const response = await fetch(`${API_BASE_URL}/settings/system/telegram/test`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chat_id: chatId }),
    });

    if (!response.ok) {
      // Get error message from response
      let errorMessage = "Failed to send test Telegram message.";
      let errorDetails = null;
      
      try {
        const text = await response.text();
        if (text) {
          try {
            const errorData = JSON.parse(text);
            errorDetails = errorData;
            // Extract error message from various possible fields
            errorMessage = errorData.message 
              || errorData.error 
              || errorData.errors?.message
              || (typeof errorData.errors === 'string' ? errorData.errors : null)
              || errorMessage;
            
            // Log detailed error information
            logger.error("Telegram test error:", {
              status: response.status,
              statusText: response.statusText,
              error: errorMessage,
              details: errorData,
            });
          } catch (parseError) {
            // Response is text but not JSON
            errorMessage = text || response.statusText || errorMessage;
            logger.error("Telegram test error (non-JSON response):", {
              status: response.status,
              statusText: response.statusText,
              responseText: text,
            });
          }
        } else {
          // Empty response body
          errorMessage = response.statusText || errorMessage;
          logger.error("Telegram test error (empty response):", {
            status: response.status,
            statusText: response.statusText,
          });
        }
      } catch (e) {
        // Failed to read response
        logger.error("Telegram test error (failed to read response):", {
          status: response.status,
          statusText: response.statusText,
          error: e.message,
        });
        errorMessage = response.statusText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = errorDetails;
      throw error;
    }

    const data = await response.json();
    return data;
  }, []);

  const refetch = useCallback(() => {
    return fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    testTelegram,
    refetch,
  };
}


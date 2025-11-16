"use client";

import { useState, useCallback } from "react";
import { handleApiError, getUserFriendlyErrorMessage } from "@/utils/api-error-handler";

/**
 * Custom hook for handling API errors with state management
 * 
 * @returns {object} Error state and handlers
 */
export function useApiError() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(async (errorOrResponse) => {
    setIsLoading(false);
    const handledError = await handleApiError(errorOrResponse);
    setError(handledError);
    return handledError;
  }, []);

  const executeWithErrorHandling = useCallback(async (asyncFn) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setIsLoading(false);
      return { data: result, error: null };
    } catch (err) {
      const handledError = await handleError(err);
      return { data: null, error: handledError };
    }
  }, [handleError]);

  const getErrorMessage = useCallback(() => {
    if (!error) return null;
    return getUserFriendlyErrorMessage(error);
  }, [error]);

  return {
    error,
    isLoading,
    clearError,
    handleError,
    executeWithErrorHandling,
    getErrorMessage,
    hasError: !!error,
  };
}

